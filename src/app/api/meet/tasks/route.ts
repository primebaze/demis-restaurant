import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeet } from "@/lib/meet-auth";
import { activePeople, firstNameOf } from "@/lib/meet-people";
import { readUrl, isOurPath } from "@/lib/meet-storage";
import { notifyPeople } from "@/lib/meet-notify";
import { isDate, londonToday, dayLabel } from "@/lib/meet-rota";
import type { MeetTask } from "@prisma/client";

export const dynamic = "force-dynamic";

type Step = { text: string; done: boolean };
const stepsOf = (t: MeetTask): Step[] => (Array.isArray(t.steps) ? (t.steps as Step[]) : []);
const cleanSteps = (v: unknown): Step[] =>
  Array.isArray(v) ? v.map((s) => (typeof s === "string" ? s : (s as Step)?.text)).filter((s): s is string => typeof s === "string" && !!s.trim()).slice(0, 12).map((s) => ({ text: s.trim().slice(0, 140), done: false })) : [];

function view(t: MeetTask, meetingTitle: string, ownerName = "") {
  const steps = stepsOf(t);
  return {
    id: t.id, title: t.title, ownerId: t.ownerId, owner: ownerName, dueDate: t.dueDate, status: t.status, steps,
    stepsDone: steps.filter((s) => s.done).length, meetingId: t.meetingId, meeting: meetingTitle, quote: t.quote, quoteBy: t.quoteBy, quoteMs: t.quoteMs,
    note: t.note, helpNote: t.helpNote, hasPhoto: !!t.photoPath, createdBy: firstNameOf(t.createdBy), doneAt: t.doneAt?.toISOString() || "",
    nudgedAt: t.nudgedAt?.toISOString() || "", at: t.createdAt.toISOString(),
  };
}

async function meetingTitles(ids: (string | null)[]) {
  const list = Array.from(new Set(ids.filter((x): x is string => !!x)));
  if (!list.length) return new Map<string, string>();
  const rows = await prisma.meetMeeting.findMany({ where: { id: { in: list } }, select: { id: true, title: true } });
  return new Map(rows.map((r) => [r.id, r.title]));
}

/**
 * GET            : my tasks (open and recently done) with this month's numbers (designs 9, 14).
 * GET ?id=       : one of my tasks, with the meeting quote and its photo (design 10). Managers can open anyone's.
 * GET ?manage=1  : managers: everyone's tasks (design 7).
 */
export async function GET(req: Request) {
  const me = await requireMeet();
  if (!me) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (id) {
    const t = await prisma.meetTask.findUnique({ where: { id } });
    if (!t || (t.ownerId !== me.person.id && !me.manager)) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    const titles = await meetingTitles([t.meetingId]);
    const meeting = t.meetingId ? await prisma.meetMeeting.findUnique({ where: { id: t.meetingId }, select: { startedAt: true, startsAt: true } }) : null;
    return NextResponse.json({
      task: { ...view(t, titles.get(t.meetingId || "") || ""), photo: t.photoPath ? await readUrl(t.photoPath) : "", meetingDate: (meeting?.startedAt || meeting?.startsAt)?.toISOString() || "" },
      today: londonToday(),
    }, { headers: { "Cache-Control": "no-store" } });
  }

  if (url.searchParams.get("manage") === "1") {
    if (!me.manager) return NextResponse.json({ error: "Managers only" }, { status: 403 });
    const people = await activePeople();
    const nameOf = new Map(people.map((p) => [p.id, p.name]));
    const tasks = await prisma.meetTask.findMany({
      where: { OR: [{ status: { in: ["suggested", "open", "help"] } }, { status: "done", doneAt: { gte: new Date(Date.now() - 30 * 86400_000) } }] },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      take: 400,
    });
    const titles = await meetingTitles(tasks.map((t) => t.meetingId));
    return NextResponse.json({
      today: londonToday(),
      people: people.map((p) => ({ id: p.id, name: p.name })),
      tasks: tasks.map((t) => view(t, titles.get(t.meetingId || "") || "", nameOf.get(t.ownerId) || "Someone who has left")),
    }, { headers: { "Cache-Control": "no-store" } });
  }

  const monthStart = londonToday().slice(0, 8) + "01";
  const tasks = await prisma.meetTask.findMany({
    where: { ownerId: me.person.id, OR: [{ status: { in: ["open", "help"] } }, { status: "done", doneAt: { gte: new Date(Date.now() - 45 * 86400_000) } }] },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });
  const titles = await meetingTitles(tasks.map((t) => t.meetingId));
  const doneThisMonth = tasks.filter((t) => t.status === "done" && t.doneAt && t.doneAt.toISOString().slice(0, 10) >= monthStart);
  const onTime = doneThisMonth.filter((t) => !t.dueDate || (t.doneAt && t.doneAt.toISOString().slice(0, 10) <= t.dueDate)).length;
  const dueThisMonth = tasks.filter((t) => t.status !== "done" && t.dueDate >= monthStart).length + doneThisMonth.length;
  return NextResponse.json({
    today: londonToday(),
    stats: { open: tasks.filter((t) => t.status !== "done").length, doneThisMonth: doneThisMonth.length, ofThisMonth: dueThisMonth, onTime },
    tasks: tasks.map((t) => view(t, titles.get(t.meetingId || "") || "")),
  }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * POST
 *   owner:    { id, action: "step", index, done } · { id, action: "done" | "reopen" }
 *             { id, action: "help", note } · { id, action: "note", note } · { id, action: "photo", photoPath }
 *   managers: { action: "create", title, ownerId, dueDate, steps, meetingId? } · { id, action: "edit", title?, ownerId?, dueDate?, steps? }
 *             { id, action: "confirm" | "dismiss" | "nudge" | "delete" }
 */
export async function POST(req: Request) {
  const me = await requireMeet();
  if (!me) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const today = londonToday();

  try {
    if (body.action === "create") {
      if (!me.manager) return NextResponse.json({ error: "Managers only" }, { status: 403 });
      const title = typeof body.title === "string" ? body.title.trim().slice(0, 160) : "";
      const ownerId = Number(body.ownerId);
      const people = await activePeople();
      if (!title) return NextResponse.json({ error: "Say what needs doing" }, { status: 400 });
      if (!people.some((p) => p.id === ownerId)) return NextResponse.json({ error: "Pick who it's for" }, { status: 400 });
      if (body.dueDate && (!isDate(body.dueDate) || body.dueDate < today)) return NextResponse.json({ error: "Pick a due date from today on" }, { status: 400 });
      const meetingId = typeof body.meetingId === "string" && (await prisma.meetMeeting.findUnique({ where: { id: body.meetingId } })) ? body.meetingId : null;
      const t = await prisma.meetTask.create({ data: { title, ownerId, dueDate: body.dueDate || "", steps: cleanSteps(body.steps), meetingId, createdBy: me.person.name } });
      if (ownerId !== me.person.id) {
        await notifyPeople([ownerId], { title: `New task: ${title}`, body: `From ${firstNameOf(me.person.name)}${t.dueDate ? ` · due ${dayLabel(t.dueDate)}` : ""}`, url: `/meet?task=${t.id}`, tag: `task-${t.id}`, icon: "assignment_ind" }).catch(() => null);
      }
      return NextResponse.json({ ok: true, id: t.id });
    }

    const t = await prisma.meetTask.findUnique({ where: { id: String(body.id || "") } });
    if (!t) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    const isOwner = t.ownerId === me.person.id;

    // The owner's own actions (managers can do them too, e.g. tick off on someone's behalf).
    if (["step", "done", "reopen", "help", "note", "photo"].includes(body.action)) {
      if (!isOwner && !me.manager) return NextResponse.json({ error: "That's not your task" }, { status: 403 });
      if (body.action === "step") {
        const steps = stepsOf(t);
        const i = Number(body.index);
        if (!Number.isInteger(i) || !steps[i]) return NextResponse.json({ error: "Which step?" }, { status: 400 });
        steps[i] = { ...steps[i], done: !!body.done };
        await prisma.meetTask.update({ where: { id: t.id }, data: { steps } });
        return NextResponse.json({ ok: true });
      }
      if (body.action === "done") {
        await prisma.meetTask.update({ where: { id: t.id }, data: { status: "done", doneAt: new Date(), steps: stepsOf(t).map((s) => ({ ...s, done: true })) } });
        return NextResponse.json({ ok: true });
      }
      if (body.action === "reopen") {
        await prisma.meetTask.update({ where: { id: t.id }, data: { status: "open", doneAt: null } });
        return NextResponse.json({ ok: true });
      }
      if (body.action === "help") {
        const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
        if (!note) return NextResponse.json({ error: "Say what you need" }, { status: 400 });
        await prisma.meetTask.update({ where: { id: t.id }, data: { status: "help", helpNote: note } });
        const managers = (await activePeople()).filter((p) => p.manager && p.id !== me.person.id).map((p) => p.id);
        await notifyPeople(managers, { title: `Needs help: ${t.title}`, body: `${firstNameOf(me.person.name)}: ${note}`, url: "/meet/tasks", tag: `task-${t.id}`, icon: "front_hand" }).catch(() => null);
        return NextResponse.json({ ok: true });
      }
      if (body.action === "note") {
        await prisma.meetTask.update({ where: { id: t.id }, data: { note: typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "" } });
        return NextResponse.json({ ok: true });
      }
      if (body.action === "photo") {
        if (!isOurPath(body.photoPath, "tasks")) return NextResponse.json({ error: "Add the photo again" }, { status: 400 });
        await prisma.meetTask.update({ where: { id: t.id }, data: { photoPath: body.photoPath } });
        return NextResponse.json({ ok: true });
      }
    }

    if (!me.manager) return NextResponse.json({ error: "Managers only" }, { status: 403 });

    if (body.action === "edit") {
      const data: Partial<MeetTask> & { steps?: Step[] } = {};
      if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim().slice(0, 160);
      if (body.ownerId != null) {
        const ownerId = Number(body.ownerId);
        if (!(await activePeople()).some((p) => p.id === ownerId)) return NextResponse.json({ error: "Pick who it's for" }, { status: 400 });
        data.ownerId = ownerId;
      }
      if (body.dueDate !== undefined) {
        if (body.dueDate && !isDate(body.dueDate)) return NextResponse.json({ error: "Check the date" }, { status: 400 });
        data.dueDate = body.dueDate || "";
      }
      if (body.steps !== undefined) data.steps = cleanSteps(body.steps);
      await prisma.meetTask.update({ where: { id: t.id }, data });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "confirm") {
      if (t.status !== "suggested") return NextResponse.json({ error: "Already confirmed" }, { status: 400 });
      await prisma.meetTask.update({ where: { id: t.id }, data: { status: "open" } });
      await notifyPeople([t.ownerId], { title: `New task: ${t.title}`, body: `From the meeting${t.dueDate ? ` · due ${dayLabel(t.dueDate)}` : ""}`, url: `/meet?task=${t.id}`, tag: `task-${t.id}`, icon: "assignment_ind" }).catch(() => null);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "dismiss") {
      await prisma.meetTask.update({ where: { id: t.id }, data: { status: "dismissed" } });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "nudge") {
      if (t.nudgedAt && Date.now() - t.nudgedAt.getTime() < 6 * 3600_000) return NextResponse.json({ error: "Nudged in the last 6 hours already" }, { status: 400 });
      await prisma.meetTask.update({ where: { id: t.id }, data: { nudgedAt: new Date() } });
      const late = t.dueDate && t.dueDate < today;
      await notifyPeople([t.ownerId], { title: `${late ? "Overdue" : "Reminder"}: ${t.title}`, body: `${firstNameOf(me.person.name)} sent you a nudge${t.dueDate ? ` · ${late ? "was due" : "due"} ${dayLabel(t.dueDate)}` : ""}`, url: `/meet?task=${t.id}`, tag: `task-${t.id}`, icon: "priority_high" }).catch(() => null);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "delete") {
      await prisma.meetTask.delete({ where: { id: t.id } });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't save that" }, { status: 502 });
  }
}

