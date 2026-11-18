import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeet } from "@/lib/meet-auth";
import { meetingFor } from "@/lib/meet-meetings";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const KINDS = ["hello", "offer", "answer", "ice", "bye", "state", "ended"];
const PEER = /^[0-9]{1,9}-[a-z0-9]{6,16}$/; // "<clockinId>-<random>"

async function allowed(id: string) {
  const me = await requireMeet();
  if (!me) return { error: NextResponse.json({ error: "Sign in first" }, { status: 401 }) };
  const found = await meetingFor(id, me);
  if (!found || found.meeting.status !== "live") return { error: NextResponse.json({ error: "This meeting isn't live" }, { status: 404 }) };
  if (!found.mine?.joinedAt) return { error: NextResponse.json({ error: "Join first" }, { status: 403 }) };
  return { me, found };
}

/**
 * GET ?peer=<my peer id>&after=<last id seen> : messages for me (or everyone) since then.
 * after=-1 just returns the newest id, so a new joiner starts from now.
 */
export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const a = await allowed(id);
  if (a.error) return a.error;
  const url = new URL(req.url);
  const peer = url.searchParams.get("peer") || "";
  if (!PEER.test(peer) || !peer.startsWith(`${a.me.person.id}-`)) return NextResponse.json({ error: "Bad peer" }, { status: 400 });
  const after = Number(url.searchParams.get("after") || "-1");
  if (!Number.isFinite(after) || after < 0) {
    const last = await prisma.meetSignal.findFirst({ where: { meetingId: id }, orderBy: { id: "desc" }, select: { id: true } });
    return NextResponse.json({ last: String(last?.id ?? 0), signals: [] }, { headers: { "Cache-Control": "no-store" } });
  }
  const rows = await prisma.meetSignal.findMany({
    where: { meetingId: id, id: { gt: BigInt(Math.floor(after)) }, fromPeer: { not: peer }, OR: [{ toPeer: peer }, { toPeer: "" }] },
    orderBy: { id: "asc" },
    take: 200,
  });
  return NextResponse.json(
    { last: rows.length ? String(rows[rows.length - 1].id) : String(after), signals: rows.map((r) => ({ id: String(r.id), from: r.fromPeer, to: r.toPeer, kind: r.kind, data: r.data })) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** POST { from, to, kind, data } : send a message to one peer (to) or everyone (to: ""). */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const a = await allowed(id);
  if (a.error) return a.error;
  const body = await req.json().catch(() => ({}));
  const from = String(body.from || "");
  const to = String(body.to || "");
  if (!PEER.test(from) || !from.startsWith(`${a.me.person.id}-`) || (to && !PEER.test(to)) || !KINDS.includes(body.kind)) {
    return NextResponse.json({ error: "Bad message" }, { status: 400 });
  }
  // "ended": a manager ended the meeting for everyone; every phone in the call closes within a second.
  if (body.kind === "ended" && !a.me.manager) return NextResponse.json({ error: "Managers only" }, { status: 403 });
  const data = body.data && typeof body.data === "object" ? body.data : {};
  if (JSON.stringify(data).length > 20_000) return NextResponse.json({ error: "Too big" }, { status: 413 });
  await prisma.meetSignal.create({ data: { meetingId: id, fromPeer: from, toPeer: to, kind: body.kind, data } });
  if (body.kind === "hello") {
    // Tidy: messages older than 3 hours are no use to anyone.
    await prisma.meetSignal.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 3 * 3600_000) } } }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
