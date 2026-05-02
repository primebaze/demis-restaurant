import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
export const dynamic = "force-dynamic";

interface GuestImportRow {
  name: string;
  email: string;
  phone: string;
}

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

    const buffer = Buffer.from(await file.arrayBuffer());
    // Dynamically import to avoid issues with Next.js edge bundling
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParse = (await import("pdf-parse")) as any;
    const parseFn = pdfParse.default ?? pdfParse;
    let text = "";
    try {
      const result = await parseFn(buffer);
      text = result.text;
    } catch {
      return NextResponse.json({ error: "Could not read PDF. Try a text-based PDF." }, { status: 400 });
    }

    const rows = extractFromText(text);
    return NextResponse.json({ rows });
  }

  // JSON — commit the import
  const body = await req.json().catch(() => null);
  if (!body?.guests || !Array.isArray(body.guests)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const guests: GuestImportRow[] = body.guests.filter(
    (g: GuestImportRow) => typeof g.name === "string" && g.name.trim().length > 0
  );

  if (guests.length === 0) return NextResponse.json({ error: "No valid guests to import" }, { status: 400 });
  if (guests.length > 2000) return NextResponse.json({ error: "Max 2000 guests per import" }, { status: 400 });

  let added = 0;
  let skipped = 0;

  for (const g of guests) {
    const name = g.name.trim().slice(0, 200);
    const email = (g.email || "").trim().slice(0, 200);
    const phone = (g.phone || "").trim().slice(0, 50);

    // Skip if email already exists
    if (email) {
      const existing = await prisma.guest.findFirst({ where: { email } });
      if (existing) { skipped++; continue; }
    }

    await prisma.guest.create({ data: { name, email, phone } });
    added++;
  }

  return NextResponse.json({ added, skipped });
}

function extractFromText(text: string): GuestImportRow[] {
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /(?:\+44\s?|0)(?:\d\s?){9,10}/g;

  const emails = Array.from(new Set(text.match(emailRegex) || []));
  const phones = Array.from(new Set(text.match(phoneRegex) || [])).map((p) => p.replace(/\s/g, ""));

  // Try to pair names with emails by looking at the text near each email
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const rows: GuestImportRow[] = [];

  // Build a map of email → nearby line (potential name)
  for (const email of emails) {
    const idx = lines.findIndex((l) => l.includes(email));
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
      const idx = lines.findIndex((l) => l.includes(row.email));
      for (const phone of phones) {
        if (usedPhones.has(phone)) continue;
        const pidx = lines.findIndex((l) => l.includes(phone));
        if (Math.abs(pidx - idx) <= 3) {
          row.phone = phone;
          usedPhones.add(phone);
          break;
        }
      }
    }
  }

  return rows;
}
