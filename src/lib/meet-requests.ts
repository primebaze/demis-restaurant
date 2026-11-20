/**
 * Swaps and time off for Demi's Meetings.
 *
 * Swap: the person picks one of their shifts and asks a colleague who's free that
 * day (or "anyone"). The colleague says yes on their phone, then a manager approves;
 * only then does the shift move to the colleague in the clock-in app.
 * Time off: the person asks for dates; a manager approves all, part, or declines.
 */
import { prisma } from "@/lib/prisma";
import { getClockinStaff, getShifts, updateShift, type ClockinStaff } from "@/lib/clockin";
import { addDays, mondayOf, weekRota, ALL, isBranch } from "@/lib/meet-rota";
import { notifyPeople, managerIds } from "@/lib/meet-notify";

export const OPEN_SWAP = ["asked", "open", "agreed"];
export const BRANCH_NAME: Record<string, string> = { cricklewood: "Cricklewood", streatham: "Streatham" };

const DAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
export const day = (d: string) => DAY.format(new Date(`${d}T12:00:00Z`));
export const range = (a: string, b: string) => (a === b ? day(a) : `${day(a)} – ${day(b)}`);
export const firstName = (n: string) => n.trim().split(/\s+/)[0] || n;

/** Active staff with no shift that day (anywhere), apart from the person asking. */
export async function freeOn(date: string, exceptId: number): Promise<ClockinStaff[]> {
  const staff = (await getClockinStaff()).filter((s) => s.active && s.id !== exceptId);
  const busy = new Set((await getShifts(date, date)).map((s) => s.staffId));
  const off = await approvedOffOn(date);
  return staff.filter((s) => !busy.has(s.id) && !off.has(s.id));
}

/** People with approved time off covering a date. */
export async function approvedOffOn(date: string): Promise<Set<number>> {
  const rows = await prisma.meetRequest.findMany({
    where: { kind: "timeoff", status: "approved", approvedFrom: { lte: date }, approvedTo: { gte: date } },
    select: { clockinId: true },
  });
  return new Set(rows.map((r) => r.clockinId));
}

/** Time off (approved or waiting) that overlaps a date range, for the rota grids. */
export async function timeOffBetween(from: string, to: string) {
  const rows = await prisma.meetRequest.findMany({
    where: {
      kind: "timeoff",
      status: { in: ["asked", "approved"] },
      OR: [
        { status: "approved", approvedFrom: { lte: to }, approvedTo: { gte: from } },
        { status: "asked", fromDate: { lte: to }, toDate: { gte: from } },
      ],
    },
  });
  return rows.map((r) => ({
    id: r.id,
    staffId: r.clockinId,
    status: r.status as "asked" | "approved",
    from: r.status === "approved" ? r.approvedFrom : r.fromDate,
    to: r.status === "approved" ? r.approvedTo : r.toDate,
  }));
}

/**
 * Approve a swap that the colleague agreed to: move the shift in the clock-in app,
 * keep the sent rota in step (so "Send changes" doesn't tell them again), tell both.
 */
export async function approveSwap(id: string, managerName: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await prisma.meetRequest.findUnique({ where: { id } });
  if (!r || r.kind !== "swap") return { ok: false, error: "Request not found" };
  if (r.status !== "agreed" || !r.targetId || !r.shiftId) return { ok: false, error: "No one has agreed to take this shift yet" };

  const shifts = await getShifts(r.shiftDate, r.shiftDate);
  const shift = shifts.find((s) => s.id === r.shiftId);
  if (!shift || shift.staffId !== r.clockinId) return { ok: false, error: "That shift has changed since the request. Decline it and ask them to send a new one." };
  if (shifts.some((s) => s.staffId === r.targetId)) return { ok: false, error: "The colleague now has a shift that day" };

  // Pin the shift to its branch first: an untagged shift takes the branch of whoever works it, so a
  // swap to someone from the other branch would otherwise quietly move the shift there.
  if (isBranch(r.branch)) {
    await prisma.meetShiftBranch.upsert({ where: { shiftId: shift.id }, create: { shiftId: shift.id, branch: r.branch }, update: {} });
  }
  await updateShift(shift.id, { staffId: r.targetId, date: shift.date, start: shift.start, end: shift.end, notes: shift.notes }, managerName);

  // Keep the week's sent rota in step, so this isn't counted as an unsent change.
  const monday = mondayOf(r.shiftDate);
  const last = await prisma.meetRotaPublish.findFirst({ where: { branch: ALL, weekStart: monday }, orderBy: { publishedAt: "desc" } });
  if (last) {
    const staff = (await getClockinStaff()).filter((s) => s.active);
    const { shifts: now } = await weekRota(monday, staff);
    const moved = now.find((s) => s.id === shift.id);
    const oldKey = `${r.clockinId}|${shift.date}|${shift.start}|${shift.end}|${r.branch || moved?.branch}`;
    const newKey = moved ? `${moved.staffId}|${moved.date}|${moved.start}|${moved.end}|${moved.branch}` : "";
    const snap = ((last.snapshot as string[]) || []).filter((k) => k !== oldKey);
    if (newKey && ((last.snapshot as string[]) || []).includes(oldKey)) snap.push(newKey);
    await prisma.meetRotaPublish.update({ where: { id: last.id }, data: { snapshot: snap.sort() } });
  }

  await prisma.meetRequest.update({ where: { id }, data: { status: "approved", decidedBy: managerName.slice(0, 80), decidedAt: new Date() } });

  const staff = await getClockinStaff();
  const nameOf = (n: number) => staff.find((s) => s.id === n)?.name || "Your colleague";
  const when = `${day(shift.date)} ${shift.start} – ${shift.end}`;
  await notifyPeople([r.clockinId], { title: "Swap approved", body: `${firstName(nameOf(r.targetId))} is now doing your shift on ${when}.`, url: "/meet?tab=rota", tag: `req-${id}` }).catch(() => {});
  await notifyPeople([r.targetId], { title: "New shift for you", body: `You're now on ${when} at ${BRANCH_NAME[r.branch] || "Demi's"}, swapped from ${firstName(nameOf(r.clockinId))}.`, url: "/meet?tab=rota", tag: `req-${id}` }).catch(() => {});
  return { ok: true };
}

/** Tell the managers something is waiting for them. */
export async function tellManagers(title: string, body: string, exceptId?: number) {
  const ids = (await managerIds()).filter((m) => m !== exceptId);
  await notifyPeople(ids, { title, body, url: "/meet/rota/requests", tag: "requests" }).catch(() => {});
}

export { addDays };
