import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface GuestImportRow {
  name: string;
  email: string;
  phone: string;
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAX_ROWS = 2000;

// POST /api/admin/guests/import
// Body (JSON): { guests: GuestImportRow[] }  — structured import
// Body (FormData): file=<pdf>                — PDF text extraction, returns { rows } for preview
export async function POST(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") || "";

  // PDF upload — extract text and return rows for client preview
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    let text = "";
    try {
      // pdf-parse v2: a class, not the v1 function. Loaded on demand.
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: Buffer.from(await file.arrayBuffer()) });
      try {
        text = (await parser.getText()).text;
      } finally {
        await parser.destroy();
      }
    } catch (err) {
      console.error("[guests/import] PDF read failed:", err);
      return NextResponse.json({ error: "Could not read this PDF. Try a text-based PDF, or a CSV." }, { status: 400 });
    }

    return NextResponse.json({ rows: extractFromText(text) });
  }

  // JSON — commit the import
  const body = await req.json().catch(() => null);
  if (!body?.guests || !Array.isArray(body.guests)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (body.guests.length > MAX_ROWS) {
    return NextResponse.json({ error: `Max ${MAX_ROWS} guests per import` }, { status: 400 });
  }

  // Every guest is keyed by a unique email, so a row without a usable one can't be saved.
  // Emails are lowercased so "John@Gmail.com" and "john@gmail.com" count as the same person.
  let noEmail = 0;
  let repeated = 0;
  const byEmail = new Map<string, { name: string; email: string; phone: string | null }>();
  for (const g of body.guests as GuestImportRow[]) {
    const email = String(g?.email || "").trim().toLowerCase().slice(0, 200);
    if (!EMAIL.test(email)) { noEmail++; continue; }
    if (byEmail.has(email)) { repeated++; continue; }
    byEmail.set(email, {
      name: String(g?.name || "").trim().slice(0, 200),
      email,
      phone: String(g?.phone || "").trim().slice(0, 50) || null,
    });
  }

  if (byEmail.size === 0) {
    return NextResponse.json({ error: "None of these rows has a valid email address." }, { status: 400 });
  }

  try {
    // Who's already in the CRM, ignoring case. Checked in chunks to keep queries small.
    const emails = Array.from(byEmail.keys());
    const existing = new Set<string>();
    for (let i = 0; i < emails.length; i += 500) {
      const found = await prisma.guest.findMany({
        where: { email: { in: emails.slice(i, i + 500), mode: "insensitive" } },
        select: { email: true },
      });
      for (const f of found) existing.add(f.email.toLowerCase());
    }

    const fresh = emails.filter((e) => !existing.has(e)).map((e) => byEmail.get(e)!);
    // One insert for the lot; skipDuplicates covers anyone added in the meantime.
    const { count: added } = fresh.length
      ? await prisma.guest.createMany({ data: fresh, skipDuplicates: true })
      : { count: 0 };

    return NextResponse.json({
      added,
      skipped: emails.length - added + repeated, // already in the CRM, or repeated in this file
      noEmail,
    });
  } catch (err) {
    console.error("[guests/import] import failed:", err);
    return NextResponse.json({ error: "Import failed. Nothing was saved, please try again." }, { status: 500 });
  }
}

function extractFromText(text: string): GuestImportRow[] {
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /(?:\+44\s?|0)(?:\d\s?){9,10}/g;

  const emails = Array.from(new Set((text.match(emailRegex) || []).map((e) => e.toLowerCase())));
  const phones = Array.from(new Set(text.match(phoneRegex) || [])).map((p) => p.replace(/\s/g, ""));

  // Try to pair names with emails by looking at the text near each email
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const lineOf = (needle: string) => lines.findIndex((l) => l.toLowerCase().includes(needle.toLowerCase()));
  const rows: GuestImportRow[] = [];

  // Build a map of email → nearby line (potential name)
  for (const email of emails) {
    const idx = lineOf(email);
    let name = "";
    // Look at adjacent lines for a name-like string (no @, no digits-only)
    for (const offset of [-1, 1, -2, 2]) {
      const candidate = lines[idx + offset] || "";
      if (
        candidate &&
        !candidate.includes("@") &&
        !/^\d+$/.test(candidate) &&
        candidate.length > 1 &&
        candidate.length < 80
      ) {
        name = candidate;
        break;
      }
    }
    rows.push({ name, email, phone: "" });
  }

  // If no emails found, fall back to phone-only rows
  if (rows.length === 0) {
    for (const phone of phones) {
      rows.push({ name: "", email: "", phone });
    }
  } else {
    // Try to assign unused phones to rows without one
    const usedPhones = new Set<string>();
    for (const row of rows) {
      const idx = lineOf(row.email);
      for (const phone of phones) {
        if (usedPhones.has(phone)) continue;
        const pidx = lineOf(phone);
        if (pidx >= 0 && Math.abs(pidx - idx) <= 3) {
          row.phone = phone;
          usedPhones.add(phone);
          break;
        }
      }
    }
  }

  return rows;
}
