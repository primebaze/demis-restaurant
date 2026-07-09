import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import Papa from "papaparse";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const ONE_EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

type Pair = { email: string; name: string };

/** A non-email cell that reads like a person's name. */
function looksLikeName(c: string): boolean {
  return c.length > 0 && c.length <= 60 && !c.includes("@") && /[a-zA-Z]/.test(c);
}

/** CSV: pull an email + optional name from each row, any column order. */
function parseCsv(text: string): Pair[] {
  const rows = Papa.parse<string[]>(text, { skipEmptyLines: true }).data;
  const out: Pair[] = [];
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    const cells = row.map((c) => (c || "").trim());
    const email = cells.find((c) => ONE_EMAIL_RE.test(c));
    if (!email) continue;
    const name = cells.find((c) => c !== email && !ONE_EMAIL_RE.test(c) && looksLikeName(c)) || "";
    out.push({ email, name });
  }
  return out;
}

/** PDF: extract text, then pull every email (names aren't reliable from PDFs). */
async function parsePdf(buffer: Buffer): Promise<Pair[]> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  const emails = (result.text || "").match(EMAIL_RE) || [];
  return emails.map((email) => ({ email, name: "" }));
}

export async function POST(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const name = file.name.toLowerCase();
  const isCsv = name.endsWith(".csv") || file.type.includes("csv") || file.type.includes("text");
  const isPdf = name.endsWith(".pdf") || file.type.includes("pdf");
  if (!isCsv && !isPdf) {
    return NextResponse.json({ error: "Please upload a .csv or .pdf file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let pairs: Pair[];
  try {
    pairs = isCsv ? parseCsv(buffer.toString("utf8")) : await parsePdf(buffer);
  } catch (e) {
    console.error("Mailing upload parse error:", e);
    return NextResponse.json({ error: "Could not read that file. Check it's a valid CSV or PDF." }, { status: 400 });
  }

  const source = isCsv ? "csv" : "pdf";

  // Normalise + validate + dedupe within the file (keep the first non-empty name seen).
  const seen = new Map<string, string>();
  let invalid = 0;
  for (const p of pairs) {
    const email = p.email.trim().toLowerCase();
    if (!ONE_EMAIL_RE.test(email)) {
      invalid++;
      continue;
    }
    if (!seen.has(email)) seen.set(email, p.name);
    else if (!seen.get(email) && p.name) seen.set(email, p.name);
  }

  const emails = Array.from(seen.keys());
  if (emails.length === 0) {
    return NextResponse.json({ added: 0, merged: 0, existing: 0, invalid, totalInFile: pairs.length, contactCount: await prisma.mailingContact.count() });
  }

  // Which already exist? (merge instead of duplicating)
  const existing = await prisma.mailingContact.findMany({
    where: { email: { in: emails } },
    select: { email: true, name: true },
  });
  const existingMap = new Map(existing.map((e) => [e.email, e.name]));

  const toCreate = emails
    .filter((e) => !existingMap.has(e))
    .map((email) => ({ email, name: seen.get(email) || "", source }));

  let added = 0;
  if (toCreate.length > 0) {
    const res = await prisma.mailingContact.createMany({ data: toCreate, skipDuplicates: true });
    added = res.count;
  }

  // Merge: fill in a name for existing contacts that don't have one.
  let merged = 0;
  for (const [email, existingName] of Array.from(existingMap.entries())) {
    const newName = seen.get(email);
    if (!existingName && newName) {
      await prisma.mailingContact.update({ where: { email }, data: { name: newName } });
      merged++;
    }
  }

  const contactCount = await prisma.mailingContact.count();
  return NextResponse.json({
    added,
    merged,
    existing: existingMap.size,
    invalid,
    totalInFile: pairs.length,
    contactCount,
  });
}
