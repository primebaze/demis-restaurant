import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookieDeviceId } from "@/lib/meet-auth";

export const dynamic = "force-dynamic";

/** POST: sign out on this phone. The phone stays approved, so signing back in only needs the PIN. */
export async function POST() {
  const id = await cookieDeviceId();
  if (id) await prisma.meetDevice.updateMany({ where: { id }, data: { sessionUntil: null } });
  return NextResponse.json({ ok: true });
}
