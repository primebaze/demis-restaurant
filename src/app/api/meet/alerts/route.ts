import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeet } from "@/lib/meet-auth";
import { housekeeping } from "@/lib/meet-housekeeping";

export const dynamic = "force-dynamic";

/** GET: my notifications (last 30 days, newest first) and how many are unread. */
export async function GET() {
  const me = await requireMeet();
  if (!me) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  await housekeeping().catch(() => {});
  const since = new Date(Date.now() - 30 * 86400_000);
  const alerts = await prisma.meetAlert.findMany({ where: { clockinId: me.person.id, createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 60 });
  return NextResponse.json(
    {
      unread: alerts.filter((a) => !a.readAt).length,
      alerts: alerts.map((a) => ({ id: a.id, title: a.title, body: a.body, url: a.url, icon: a.icon, read: !!a.readAt, at: a.createdAt.toISOString() })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** POST { all: true } or { id }: mark as read. */
export async function POST(req: Request) {
  const me = await requireMeet();
  if (!me) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const where = body.all ? { clockinId: me.person.id, readAt: null } : { id: String(body.id || ""), clockinId: me.person.id };
  await prisma.meetAlert.updateMany({ where, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
