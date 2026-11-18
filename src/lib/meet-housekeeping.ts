/**
 * Housekeeping for Demi's Meetings, at most once an hour, run from background
 * requests the app makes anyway (the bell count and the manager sidebar), so no
 * extra cron is needed on Vercel Hobby.
 *
 * - Staff who haven't opened a newly sent rota after 24 hours get one reminder.
 * - Meeting audio is deleted 30 days after the meeting (notes and transcripts stay).
 * - Live meetings nobody has been in for 20 minutes are ended.
 * - Repeating tasks whose day passed un-ticked still get their next one.
 */
import { prisma } from "@/lib/prisma";
import { notifyPeople } from "@/lib/meet-notify";
import { removeFiles } from "@/lib/meet-storage";
import { endStaleMeetings } from "@/lib/meet-meetings";
import { rollRepeatingTasks } from "@/lib/meet-tasks";
import { weekLabel } from "@/lib/meet-rota";

const KEY = "housekeeping_at";

export async function housekeeping(): Promise<void> {
  const last = await prisma.meetSetting.findUnique({ where: { key: KEY } });
  if (last && Date.now() - Number(last.value) < 3600_000) return;
  await prisma.meetSetting.upsert({ where: { key: KEY }, create: { key: KEY, value: String(Date.now()) }, update: { value: String(Date.now()) } });

  await endStaleMeetings().catch(() => {});
  await rollRepeatingTasks().catch(() => {}); // a missed repeating task: the next one still appears

  // Rota reminders: each send gets one reminder, 24 to 72 hours after it went out.
  const due = await prisma.meetRotaPublish.findMany({ where: { publishedAt: { lt: new Date(Date.now() - 24 * 3600_000), gt: new Date(Date.now() - 72 * 3600_000) } } });
  for (const p of due) {
    const done = await prisma.meetLog.findFirst({ where: { action: "rota_reminded", target: p.id } });
    if (done) continue;
    await prisma.meetLog.create({ data: { action: "rota_reminded", target: p.id, by: "housekeeping" } });
    const onRota = Array.from(new Set(((p.snapshot as string[]) || []).map((k) => Number(k.split("|")[0]))));
    const seen = new Set((await prisma.meetRotaSeen.findMany({ where: { publishId: p.id } })).map((s) => s.clockinId));
    const todo = onRota.filter((id) => !seen.has(id));
    if (todo.length) {
      await notifyPeople(todo, { title: `Reminder: your shifts for ${weekLabel(p.weekStart)}`, body: "Open the app to check your rota.", url: "/meet?tab=rota", tag: `rota-${p.weekStart}`, icon: "view_timeline" }, { email: false }).catch(() => null);
    }
  }

  // Audio older than 30 days goes; the transcript and notes stay on the meeting.
  const old = await prisma.meetMeeting.findMany({ where: { endedAt: { lt: new Date(Date.now() - 30 * 86400_000) } }, select: { id: true } });
  if (old.length) {
    const recs = await prisma.meetRecording.findMany({ where: { meetingId: { in: old.map((m) => m.id) } }, take: 200 });
    if (recs.length) {
      await removeFiles(recs.map((r) => r.path)).catch(() => {});
      await prisma.meetRecording.deleteMany({ where: { id: { in: recs.map((r) => r.id) } } });
    }
  }
}
