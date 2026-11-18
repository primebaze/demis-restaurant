import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeet } from "@/lib/meet-auth";
import { activePeople, firstNameOf } from "@/lib/meet-people";
import { readUrls, isOurPath } from "@/lib/meet-storage";
import { notifyPeople } from "@/lib/meet-notify";
import { isBranch, isDate, londonToday } from "@/lib/meet-rota";

export const dynamic = "force-dynamic";

const PROBLEMS = ["equipment", "stock", "safety", "customer", "hours", "other"];
const CONCERNS = ["behaviour", "bullying", "safety", "timekeeping", "other"];

/**
 * GET           : reports I sent with my name on (and their status or reply).
 * GET ?manage=1 : managers: the inbox. A report about a manager is never shown to that manager.
 */
export async function GET(req: Request) {
  const me = await requireMeet();
  if (!me) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const manage = new URL(req.url).searchParams.get("manage") === "1";

  if (!manage) {
    const mine = await prisma.meetReport.findMany({ where: { reporterId: me.person.id }, orderBy: { createdAt: "desc" }, take: 20 });
    return NextResponse.json({
      reports: mine.map((r) => ({ id: r.id, kind: r.kind, category: r.category, body: r.body, status: r.status, reply: r.reply, at: r.createdAt.toISOString() })),
    }, { headers: { "Cache-Control": "no-store" } });
  }

  if (!me.manager) return NextResponse.json({ error: "Managers only" }, { status: 403 });
  try {
    const people = await activePeople();
    const nameOf = (id: number | null) => (id ? people.find((p) => p.id === id)?.name || "Someone who has left" : "");
    const rows = await prisma.meetReport.findMany({
      where: { OR: [{ aboutId: null }, { aboutId: { not: me.person.id } }], createdAt: { gte: new Date(Date.now() - 120 * 86400_000) } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const photos = await readUrls(rows.map((r) => r.photoPath));
    return NextResponse.json({
      reports: rows.map((r) => ({
        id: r.id, kind: r.kind, category: r.category, body: r.body, urgent: r.urgent, branch: r.branch, happenedOn: r.happenedOn,
        photo: photos.get(r.photoPath) || "", from: r.reporterId ? nameOf(r.reporterId) : "", fromId: r.reporterId || 0,
        about: nameOf(r.aboutId), aboutId: r.aboutId || 0, status: r.status, reply: r.reply, handledBy: r.handledBy,
        handledAt: r.handledAt?.toISOString() || "", at: r.createdAt.toISOString(),
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Can't load reports" }, { status: 502 });
  }
}

/**
 * POST
 *   staff:    { kind: "problem", category, body, urgent, branch, photoPath }
 *             { kind: "person", aboutId, category, happenedOn, branch, body, anonymous }
 *   managers: { action: "seen" | "close" | "reopen", id, reply? }
 */
export async function POST(req: Request) {
  const me = await requireMeet();
  if (!me) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const text = typeof body.body === "string" ? body.body.trim().slice(0, 4000) : "";

  try {
    if (body.kind === "problem") {
      if (!PROBLEMS.includes(body.category)) return NextResponse.json({ error: "Pick what kind of problem" }, { status: 400 });
      if (text.length < 3) return NextResponse.json({ error: "Say what's wrong" }, { status: 400 });
      const r = await prisma.meetReport.create({
        data: {
          kind: "problem", category: body.category, body: text, urgent: !!body.urgent, branch: isBranch(body.branch) ? body.branch : "",
          photoPath: isOurPath(body.photoPath, "reports") ? body.photoPath : "", reporterId: me.person.id,
        },
      });
      const managers = (await activePeople()).filter((p) => p.manager && p.id !== me.person.id).map((p) => p.id);
      await notifyPeople(managers, {
        title: `${body.urgent ? "Urgent: " : ""}${body.category === "hours" ? "Hours" : body.category[0].toUpperCase() + body.category.slice(1)} problem`,
        body: `${firstNameOf(me.person.name)}: ${text.slice(0, 160)}`,
        url: "/meet/reports", tag: `report-${r.id}`, icon: "report",
      }).catch(() => null);
      return NextResponse.json({ ok: true });
    }

    if (body.kind === "person") {
      const people = await activePeople();
      const aboutId = Number(body.aboutId);
      if (!people.some((p) => p.id === aboutId) || aboutId === me.person.id) return NextResponse.json({ error: "Choose who it's about" }, { status: 400 });
      if (!CONCERNS.includes(body.category)) return NextResponse.json({ error: "Pick what it's about" }, { status: 400 });
      if (text.length < 3) return NextResponse.json({ error: "Describe what happened" }, { status: 400 });
      const happenedOn = isDate(body.happenedOn) && body.happenedOn <= londonToday() ? body.happenedOn : "";
      const r = await prisma.meetReport.create({
        data: {
          kind: "person", category: body.category, body: text, branch: isBranch(body.branch) ? body.branch : "", happenedOn,
          reporterId: body.anonymous ? null : me.person.id, aboutId,
        },
      });
      // Managers only, never the person it's about, and no names in the notification itself.
      const managers = people.filter((p) => p.manager && p.id !== aboutId && p.id !== me.person.id).map((p) => p.id);
      await notifyPeople(managers, { title: "A private report", body: "Someone sent a concern about a colleague. Open Reports to read it.", url: "/meet/reports", tag: `report-${r.id}`, icon: "shield_person" }, { email: true }).catch(() => null);
      return NextResponse.json({ ok: true });
    }

    if (!me.manager) return NextResponse.json({ error: "Managers only" }, { status: 403 });
    const r = await prisma.meetReport.findUnique({ where: { id: String(body.id || "") } });
    if (!r || r.aboutId === me.person.id) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    const reply = typeof body.reply === "string" ? body.reply.trim().slice(0, 1000) : "";

    if (body.action === "seen") {
      if (r.status === "new") await prisma.meetReport.update({ where: { id: r.id }, data: { status: "seen", handledBy: me.person.name.slice(0, 80), handledAt: new Date() } });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "close") {
      await prisma.meetReport.update({ where: { id: r.id }, data: { status: "closed", reply, handledBy: me.person.name.slice(0, 80), handledAt: new Date() } });
      if (r.reporterId) {
        await notifyPeople([r.reporterId], { title: "Your report is sorted", body: reply || "A manager has dealt with what you reported. Thank you.", url: "/meet?tab=me", tag: `report-${r.id}`, icon: "task_alt" }).catch(() => null);
      }
      return NextResponse.json({ ok: true });
    }
    if (body.action === "reopen") {
      await prisma.meetReport.update({ where: { id: r.id }, data: { status: "seen" } });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't send that" }, { status: 502 });
  }
}
