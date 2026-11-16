import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeet } from "@/lib/meet-auth";
import { pushPublicKey } from "@/lib/meet-notify";

export const dynamic = "force-dynamic";

/** GET: the key the phone needs to turn on notifications. */
export async function GET() {
  const me = await requireMeet();
  if (!me) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  return NextResponse.json({ publicKey: pushPublicKey() }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * POST { subscription } : notifications turned on for this phone.
 * POST { choice: "off" } : said no; they get emails instead.
 */
export async function POST(req: Request) {
  const me = await requireMeet();
  if (!me) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  if (body.choice === "off") {
    await prisma.meetDevice.update({ where: { id: me.deviceId }, data: { notifyChoice: "off" } });
    await prisma.meetPushSub.deleteMany({ where: { deviceId: me.deviceId } });
    return NextResponse.json({ ok: true });
  }

  const sub = body.subscription;
  const endpoint = typeof sub?.endpoint === "string" ? sub.endpoint : "";
  const p256dh = typeof sub?.keys?.p256dh === "string" ? sub.keys.p256dh : "";
  const auth = typeof sub?.keys?.auth === "string" ? sub.keys.auth : "";
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || !p256dh || !auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.meetPushSub.deleteMany({ where: { deviceId: me.deviceId, NOT: { endpoint } } }),
    prisma.meetPushSub.upsert({
      where: { endpoint },
      create: { endpoint, p256dh, auth, deviceId: me.deviceId, clockinId: me.person.id },
      update: { p256dh, auth, deviceId: me.deviceId, clockinId: me.person.id },
    }),
    prisma.meetDevice.update({ where: { id: me.deviceId }, data: { notifyChoice: "on" } }),
  ]);
  return NextResponse.json({ ok: true });
}
