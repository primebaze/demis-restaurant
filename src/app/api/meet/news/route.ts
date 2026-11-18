import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeet } from "@/lib/meet-auth";
import { activePeople, inAudience, isAudience, firstNameOf } from "@/lib/meet-people";
import { readUrls, isOurPath } from "@/lib/meet-storage";
import { notifyPeople } from "@/lib/meet-notify";
import { isDate, londonToday } from "@/lib/meet-rota";

export const dynamic = "force-dynamic";

const KINDS = ["menu", "rota", "kitchen", "policies"];
const KIND_ICON: Record<string, string> = { menu: "restaurant_menu", rota: "view_timeline", kitchen: "build", policies: "policy" };

/**
 * GET           : posts for me (pinned first), and opening the list counts as seeing them.
 * GET ?manage=1 : managers: every post with who has seen it and who still has to tap "Got it".
 */
export async function GET(req: Request) {
  const me = await requireMeet();
  if (!me) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const manage = new URL(req.url).searchParams.get("manage") === "1";
  if (manage && !me.manager) return NextResponse.json({ error: "Managers only" }, { status: 403 });

  try {
    const people = await activePeople();
    const mePerson = people.find((p) => p.id === me.person.id);
    const posts = await prisma.meetNews.findMany({ orderBy: { createdAt: "desc" }, take: 60 });
    const visible = manage ? posts : posts.filter((p) => inAudience(mePerson || { branch: me.branch, kitchen: false, manager: me.manager }, p.audience));
    const reads = await prisma.meetNewsRead.findMany({ where: { newsId: { in: visible.map((p) => p.id) } } });
    const photos = await readUrls(visible.map((p) => p.photoPath));

    if (!manage) {
      // Opening News marks everything shown as seen.
      const seen = new Set(reads.filter((r) => r.clockinId === me.person.id).map((r) => r.newsId));
      const fresh = visible.filter((p) => !seen.has(p.id));
      if (fresh.length) await prisma.meetNewsRead.createMany({ data: fresh.map((p) => ({ newsId: p.id, clockinId: me.person.id })), skipDuplicates: true });
      const mine = new Map(reads.filter((r) => r.clockinId === me.person.id).map((r) => [r.newsId, r]));
      const list = visible
        .map((p) => ({
          id: p.id, title: p.title, body: p.body, kind: p.kind, audience: p.audience, pinned: p.pinned, ackBy: p.ackBy,
          acked: !!mine.get(p.id)?.ackAt, photo: photos.get(p.photoPath) || "", by: firstNameOf(p.authorName), at: p.createdAt.toISOString(),
        }))
        .sort((a, b) => Number(b.pinned && !b.acked) - Number(a.pinned && !a.acked) || b.at.localeCompare(a.at));
      return NextResponse.json({ posts: list }, { headers: { "Cache-Control": "no-store" } });
    }

    const list = visible.map((p) => {
      const audience = people.filter((x) => inAudience(x, p.audience));
      const r = reads.filter((x) => x.newsId === p.id);
      const seenIds = new Set(r.map((x) => x.clockinId));
      const ackIds = new Set(r.filter((x) => x.ackAt).map((x) => x.clockinId));
      const notYet = audience.filter((x) => (p.ackBy ? !ackIds.has(x.id) : !seenIds.has(x.id)));
      return {
        id: p.id, title: p.title, body: p.body, kind: p.kind, icon: KIND_ICON[p.kind] || "campaign", audience: p.audience, pinned: p.pinned, ackBy: p.ackBy,
        photo: photos.get(p.photoPath) || "", by: firstNameOf(p.authorName), at: p.createdAt.toISOString(),
        total: audience.length, seen: audience.filter((x) => seenIds.has(x.id)).length, acked: audience.filter((x) => ackIds.has(x.id)).length,
        notYet: notYet.map((x) => ({ id: x.id, name: x.name })),
      };
    });
    return NextResponse.json({ posts: list }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Can't load news" }, { status: 502 });
  }
}

/**
 * POST
 *   staff:    { action: "ack", id }   (tap "Got it")
 *   managers: { action: "post", title, body, kind, audience, pinned, ackBy, photoPath }
 *             { action: "pin", id, pinned } · { action: "remind", id } · { action: "delete", id }
 */
export async function POST(req: Request) {
  const me = await requireMeet();
  if (!me) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  try {
    if (body.action === "ack") {
      const id = String(body.id || "");
      if (!(await prisma.meetNews.findUnique({ where: { id } }))) return NextResponse.json({ error: "Post not found" }, { status: 404 });
      await prisma.meetNewsRead.upsert({ where: { newsId_clockinId: { newsId: id, clockinId: me.person.id } }, create: { newsId: id, clockinId: me.person.id, ackAt: new Date() }, update: { ackAt: new Date() } });
      return NextResponse.json({ ok: true });
    }

    if (!me.manager) return NextResponse.json({ error: "Managers only" }, { status: 403 });

    if (body.action === "post") {
      const title = typeof body.title === "string" ? body.title.trim().slice(0, 140) : "";
      const text = typeof body.body === "string" ? body.body.trim().slice(0, 4000) : "";
      if (!title) return NextResponse.json({ error: "Add a headline" }, { status: 400 });
      if (!KINDS.includes(body.kind)) return NextResponse.json({ error: "Pick a type" }, { status: 400 });
      if (!isAudience(body.audience)) return NextResponse.json({ error: "Pick who sees it" }, { status: 400 });
      const ackBy = body.ackBy ? (isDate(body.ackBy) && body.ackBy >= londonToday() ? body.ackBy : null) : "";
      if (ackBy === null) return NextResponse.json({ error: "Pick a \"Got it\" date from today on" }, { status: 400 });
      const photoPath = isOurPath(body.photoPath, "news") ? body.photoPath : "";
      const post = await prisma.meetNews.create({
        data: { title, body: text, kind: body.kind, audience: body.audience, pinned: !!body.pinned, ackBy, photoPath, authorId: me.person.id, authorName: me.person.name },
      });
      const people = (await activePeople()).filter((p) => inAudience(p, post.audience) && p.id !== me.person.id);
      await notifyPeople(people.map((p) => p.id), { title: post.title, body: text.slice(0, 180) || "New post in News", url: "/meet?tab=news", tag: `news-${post.id}`, icon: KIND_ICON[post.kind] || "campaign" }).catch(() => null);
      return NextResponse.json({ ok: true, id: post.id, notified: people.length });
    }

    const id = String(body.id || "");
    const post = await prisma.meetNews.findUnique({ where: { id } });
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    if (body.action === "pin") {
      await prisma.meetNews.update({ where: { id }, data: { pinned: !!body.pinned } });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "remind") {
      const people = (await activePeople()).filter((p) => inAudience(p, post.audience));
      const reads = await prisma.meetNewsRead.findMany({ where: { newsId: id } });
      const done = new Set(reads.filter((r) => (post.ackBy ? r.ackAt : true)).map((r) => r.clockinId));
      const todo = people.filter((p) => !done.has(p.id)).map((p) => p.id);
      await notifyPeople(todo, { title: `Please read: ${post.title}`, body: post.ackBy ? "Open News and tap \"Got it\"." : "There's a post in News for you.", url: "/meet?tab=news", tag: `news-${post.id}`, icon: "push_pin" }).catch(() => null);
      return NextResponse.json({ ok: true, reminded: todo.length });
    }
    if (body.action === "delete") {
      await prisma.meetNewsRead.deleteMany({ where: { newsId: id } });
      await prisma.meetNews.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't save that" }, { status: 502 });
  }
}
