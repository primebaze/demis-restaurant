import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { hashSync } from "bcryptjs";
export const dynamic = "force-dynamic";

const PIN_KEY = "checkin_pin_hash";

/** GET /api/admin/checkin-pin — is a kiosk PIN configured? (never returns the PIN) */
export async function GET() {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const setting = await prisma.appSetting.findUnique({ where: { key: PIN_KEY } });
    return NextResponse.json({ configured: !!setting?.value });
  } catch {
    return NextResponse.json({ configured: false, notMigrated: true });
  }
}

/** POST /api/admin/checkin-pin — set/rotate the kiosk PIN (stored hashed). */
export async function POST(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const pin = (body.pin || "").trim();
  if (!/^\d{4}$/.test(pin))
    return NextResponse.json({ error: "PIN must be 4 digits" }, { status: 400 });

  const hash = hashSync(pin, 10);
  await prisma.appSetting.upsert({
    where: { key: PIN_KEY },
    create: { key: PIN_KEY, value: hash },
    update: { value: hash },
  });

  return NextResponse.json({ ok: true });
}
