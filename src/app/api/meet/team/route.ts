import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeet } from "@/lib/meet-auth";
import { getClockinStaff } from "@/lib/clockin";
import { listDevices } from "@/lib/meet-devices";

export const dynamic = "force-dynamic";

const BRANCHES = ["cricklewood", "streatham", "both", ""];

/** GET: everyone from the clock-in app with their branch, phones and notifications. Managers only. */
export async function GET() {
  const me = await requireMeet(true);
  if (!me) return NextResponse.json({ error: "Managers only" }, { status: 403 });

  const [staff, extras, devices, subs, locks, devList] = await Promise.all([
    getClockinStaff(), // kept for a minute; new starters show within 60s
    prisma.meetStaff.findMany(),
    prisma.meetDevice.findMany({ where: { status: { in: ["approved", "pending"] } }, select: { clockinId: true, status: true, label: true, lastSeenAt: true, notifyChoice: true } }),
    prisma.meetPushSub.findMany({ select: { clockinId: true } }),
    prisma.meetPinLock.findMany({ where: { lockedUntil: { gt: new Date() } } }),
    listDevices(),
  ]);

  const branch = new Map(extras.map((e) => [e.clockinId, e.branch]));
  const withPush = new Set(subs.map((s) => s.clockinId));
  const locked = new Map(locks.map((l) => [l.clockinId, l.lockedUntil!.toISOString()]));

  const people = staff.map((s) => {
    const mine = devices.filter((d) => d.clockinId === s.id);
    const approved = mine.filter((d) => d.status === "approved");
    const lastSeen = approved.reduce<Date | null>((a, d) => (!a || d.lastSeenAt > a ? d.lastSeenAt : a), null);
    const notifications = withPush.has(s.id) ? "on" : approved.some((d) => d.notifyChoice === "off") ? "off" : approved.length ? "not_asked" : "none";
    return {
      id: s.id,
      name: s.name,
      role: s.role,
      active: s.active,
      hasEmail: !!s.email,
      branch: branch.get(s.id) || "",
      phones: approved.map((d) => d.label),
      waiting: mine.filter((d) => d.status === "pending").length,
      notifications,
      lastSeen: lastSeen ? lastSeen.toISOString() : null,
      lockedUntil: locked.get(s.id) || null,
    };
  });

  return NextResponse.json({ people, pending: devList.pending }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * POST { action: "branch", id, branch } | { action: "unlock", id } | { action: "signout_all", id }
 */
export async function POST(req: Request) {
  const me = await requireMeet(true);
  if (!me) return NextResponse.json({ error: "Managers only" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Who?" }, { status: 400 });

  if (body.action === "branch") {
    const b = String(body.branch ?? "");
    if (!BRANCHES.includes(b)) return NextResponse.json({ error: "Unknown branch" }, { status: 400 });
    await prisma.meetStaff.upsert({ where: { clockinId: id }, create: { clockinId: id, branch: b }, update: { branch: b } });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "unlock") {
    await prisma.meetPinLock.deleteMany({ where: { clockinId: id } });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "signout_all") {
    if (id === me.person.id) return NextResponse.json({ error: "Use Sign out on your own phone" }, { status: 400 });
    await prisma.$transaction([
      prisma.meetDevice.updateMany({
        where: { clockinId: id, status: { in: ["approved", "pending"] } },
        data: { status: "revoked", sessionUntil: null, decidedBy: me.person.name.slice(0, 80), decidedAt: new Date() },
      }),
      prisma.meetPushSub.deleteMany({ where: { clockinId: id } }),
    ]);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
