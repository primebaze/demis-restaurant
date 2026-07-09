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

/** Trim junk/numbers off a candidate name and cap its length. Keeps common accents. */
function cleanName(s: string): string {
  return s
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[^A-Za-zÀ-ÿ]+/, "")
    .replace(/[^A-Za-zÀ-ÿ.'-]+$/, "")
    .slice(0, 60)
    .trim();
}

/**
 * From rows of cells: an email + optional name per row.
 * Handles both tidy columns (separate Name / Email cells) AND messy single-column
 * data where the name and email share one cell, e.g. "Cordelia Adoli  x@y.co.uk".
 */
function rowsToPairs(rows: string[][]): Pair[] {
  const out: Pair[] = [];
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    const cells = row.map((c) => (c || "").trim()).filter(Boolean);
    if (cells.length === 0) continue;

    const joined = cells.join("  ");
    const found = joined.match(EMAIL_RE);
    if (!found || found.length === 0) continue;
    const email = found[0];

    // Prefer a clean, separate name cell; otherwise take the text before the email.
    let name = cells.find((c) => !c.includes("@") && looksLikeName(c)) || "";
    if (!name) {
      const idx = joined.toLowerCase().indexOf(email.toLowerCase());
      name = cleanName(joined.slice(0, idx));
    }

    out.push({ email, name });
  }
  return out;
}

/** CSV. */
function parseCsv(text: string): Pair[] {
  const rows = Papa.parse<string[]>(text, { skipEmptyLines: true }).data;
  return rowsToPairs(rows.filter(Array.isArray));
}

/** Coerce an ExcelJS cell value (string, number, hyperlink, rich text, formula) to plain text. */
function cellText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.text === "string") return o.text;
    if (typeof o.hyperlink === "string") return o.hyperlink.replace(/^mailto:/i, "");
    if (o.result != null) return String(o.result);
    if (Array.isArray(o.richText)) return o.richText.map((r) => (r as { text?: string }).text || "").join("");
    return "";
  }
  return String(v);
}

/** XLSX (Excel): read every sheet's rows. */
async function parseXlsx(buffer: Uint8Array): Promise<Pair[]> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);
  const rows: string[][] = [];
  wb.eachSheet((sheet) => {
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell) => cells.push(cellText(cell.value).trim()));
      rows.push(cells);
    });
  });
  return rowsToPairs(rows);
}

/** PDF: extract text, then pull every email (names aren't reliable from PDFs). */
async function parsePdf(buffer: Uint8Array): Promise<Pair[]> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer as Buffer });
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
  const isXlsx = name.endsWith(".xlsx") || name.endsWith(".xls") || file.type.includes("spreadsheet") || file.type.includes("excel");
  const isPdf = name.endsWith(".pdf") || file.type.includes("pdf");
  const isCsv = !isXlsx && !isPdf && (name.endsWith(".csv") || file.type.includes("csv") || file.type.includes("text"));
  if (!isCsv && !isPdf && !isXlsx) {
    return NextResponse.json({ error: "Please upload a .csv, .xlsx, or .pdf file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let pairs: Pair[];
  try {
    pairs = isXlsx ? await parseXlsx(buffer) : isPdf ? await parsePdf(buffer) : parseCsv(buffer.toString("utf8"));
  } catch (e) {
    console.error("Mailing upload parse error:", e);
    return NextResponse.json({ error: "Could not read that file. Check it's a valid CSV, Excel, or PDF." }, { status: 400 });
  }

  const source = isXlsx ? "xlsx" : isPdf ? "pdf" : "csv";

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
