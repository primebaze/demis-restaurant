/**
 * Meeting notes: transcribe each recorded piece, merge them into one
 * transcript, then have Claude write the summary, decisions and suggested tasks.
 *
 * Env (Vercel), both optional: without them a meeting still ends cleanly and a
 * manager can write the notes by hand on the results page.
 *   DEEPGRAM_API_KEY   transcription (speaker separation on, for room recordings)
 *   ANTHROPIC_API_KEY  summary, decisions and tasks
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { MeetMeeting } from "@prisma/client";
import { readUrl } from "@/lib/meet-storage";
import { activePeople, firstNameOf } from "@/lib/meet-people";
import { notifyPeople } from "@/lib/meet-notify";
import { londonDate } from "@/lib/meet-meetings";

const MODEL = "claude-opus-5-5";

export const transcriptionReady = () => !!process.env.DEEPGRAM_API_KEY;
export const summaryReady = () => !!process.env.ANTHROPIC_API_KEY;

export type Line = { ms: number; clockinId: number; speaker: number; text: string };
type Word = { word: string; punctuated_word?: string; start: number; end: number; speaker?: number };

/** Transcribe one piece as soon as it's uploaded, so the call shows notes about a minute behind. */
export async function transcribePieceNow(recordingId: string, room: boolean) {
  if (!transcriptionReady()) return;
  const r = await prisma.meetRecording.findUnique({ where: { id: recordingId } });
  if (!r || r.status !== "uploaded") return;
  await prisma.meetRecording.update({ where: { id: r.id }, data: { status: "transcribing" } });
  try {
    const words = await transcribe(r.path, room);
    await prisma.meetRecording.update({ where: { id: r.id }, data: { status: "done", words } });
  } catch (e) {
    console.error(`[meet-notes] live transcription failed for ${r.id}: ${e instanceof Error ? e.message : e}`);
    await prisma.meetRecording.update({ where: { id: r.id }, data: { status: "uploaded" } }); // tried again when the notes are made
  }
}

/** The transcript so far for a live meeting, from the pieces already transcribed. */
export async function liveLines(meetingId: string): Promise<Line[]> {
  const done = await prisma.meetRecording.findMany({ where: { meetingId, status: "done" } });
  return mergeLines(done.map((x) => ({ clockinId: x.clockinId, startMs: x.startMs, words: (x.words as Word[]) || [] })));
}

/** One piece through Deepgram's pre-recorded API, read from a short-lived storage link. */
async function transcribe(path: string, room: boolean): Promise<Word[]> {
  const url = await readUrl(path, 900);
  if (!url) throw new Error("Recording not found in storage");
  const q = new URLSearchParams({ model: "nova-3", language: "en-GB", smart_format: "true", punctuate: "true", diarize: room ? "true" : "false" });
  const res = await fetch(`https://api.deepgram.com/v1/listen?${q}`, {
    method: "POST",
    headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(50_000),
  });
  if (!res.ok) {
    const detail = await res.json().then((j) => j?.err_msg || j?.message || "").catch(() => "");
    throw new Error(`Deepgram answered ${res.status}${res.status === 401 || res.status === 403 ? " (check DEEPGRAM_API_KEY in Vercel)" : ""}${detail ? `: ${String(detail).slice(0, 120)}` : ""}`);
  }
  const data = await res.json();
  return (data?.results?.channels?.[0]?.alternatives?.[0]?.words || []) as Word[];
}

/** Merge every piece's words into lines: a new line when the speaker changes or after a pause. */
export function mergeLines(pieces: { clockinId: number; startMs: number; words: Word[] }[]): Line[] {
  const words = pieces
    .flatMap((p) => p.words.map((w) => ({ ms: p.startMs + Math.round(w.start * 1000), end: p.startMs + Math.round(w.end * 1000), clockinId: p.clockinId, speaker: w.speaker ?? 0, text: w.punctuated_word || w.word })))
    .sort((a, b) => a.ms - b.ms);
  const lines: (Line & { end: number })[] = [];
  for (const w of words) {
    const last = lines[lines.length - 1];
    if (last && last.clockinId === w.clockinId && last.speaker === w.speaker && w.ms - last.end < 2500) {
      last.text += ` ${w.text}`;
      last.end = w.end;
    } else lines.push({ ...w });
  }
  return lines.map(({ ms, clockinId, speaker, text }) => ({ ms, clockinId, speaker, text }));
}

const Notes = z.object({
  summary: z.string().describe("3 to 5 plain sentences on what was discussed and agreed, for staff who missed it."),
  decisions: z.array(z.string()).describe("Each decision made, as one short line. Empty if none."),
  tasks: z.array(
    z.object({
      title: z.string().describe("The job, starting with a verb, under 10 words."),
      owner: z.string().describe("Exactly one name from the staff list, or an empty string if nobody was named."),
      due: z.string().describe("YYYY-MM-DD if a day was said, else an empty string."),
      quote: z.string().describe("The exact words from the transcript where the task was given."),
      quote_ms: z.number().describe("The ms value of the transcript line holding the quote."),
    }),
  ),
  speakers: z.array(z.object({ speaker: z.number(), name: z.string() })).describe("Room recordings only: best guess of each speaker number's name from the staff list, from how people address each other. Empty for video calls."),
});

async function summarise(title: string, date: string, lines: Line[], staff: { id: number; name: string }[], room: boolean, nameOf: (l: Line) => string) {
  const client = new Anthropic();
  const transcript = lines.map((l) => `[${l.ms}] ${nameOf(l)}: ${l.text}`).join("\n");
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(Notes) },
    system:
      "You write the notes for a staff meeting at Demi's, a Nigerian restaurant in London with branches in Cricklewood and Streatham. " +
      "Write in plain British English for restaurant staff: short sentences, no jargon. Only include tasks someone was actually asked to do or agreed to do. " +
      "Owners must be names from the staff list exactly as written.",
    messages: [
      {
        role: "user",
        content:
          `Meeting: ${title}\nDate: ${date}\nType: ${room ? "one device recording the whole room (speakers are numbered)" : "video call (each line is named)"}\n` +
          `Staff list: ${staff.map((s) => s.name).join(", ")}\n\nTranscript (each line starts with its ms from the start):\n${transcript}`,
      },
    ],
  });
  if (response.stop_reason === "refusal") throw new Error("The notes couldn't be written for this meeting");
  if (!response.parsed_output) throw new Error("The notes came back incomplete");
  return response.parsed_output;
}

/**
 * Move a meeting's notes forward as far as time allows. Safe to call again and
 * again (the results page does, until it says "ready").
 */
export async function processNotes(meetingId: string, budgetMs = 45_000): Promise<{ status: string; pending: number; error: string }> {
  const meeting = await prisma.meetMeeting.findUnique({ where: { id: meetingId } });
  if (!meeting) return { status: "missing", pending: 0, error: "" };
  if (meeting.status !== "ended") return { status: meeting.status, pending: 0, error: meeting.error };

  // Only one request writes a meeting's notes at a time (several people may have the notes page
  // open), so pieces aren't transcribed twice and tasks aren't made twice. A lock older than
  // 6 minutes is from a request that died, and is taken over.
  const lockKey = `notes_lock:${meetingId}`;
  await prisma.meetSetting.deleteMany({ where: { key: lockKey, updatedAt: { lt: new Date(Date.now() - 6 * 60_000) } } });
  const got = await prisma.meetSetting.create({ data: { key: lockKey, value: String(Date.now()) } }).then(() => true).catch(() => false);
  if (!got) {
    const pending = await prisma.meetRecording.count({ where: { meetingId, status: { in: ["uploaded", "transcribing"] } } });
    return { status: "ended", pending, error: "" };
  }
  try {
    // Read it again now the lock is ours: another request may have just finished the notes.
    const fresh = await prisma.meetMeeting.findUnique({ where: { id: meetingId } });
    if (!fresh || fresh.status !== "ended") return { status: fresh?.status || "missing", pending: 0, error: fresh?.error || "" };
    return await writeNotes(fresh, budgetMs);
  } finally {
    await prisma.meetSetting.deleteMany({ where: { key: lockKey } }).catch(() => {});
  }
}

async function writeNotes(start: MeetMeeting, budgetMs: number): Promise<{ status: string; pending: number; error: string }> {
  const started = Date.now();
  const meetingId = start.id;
  let meeting = start;

  const finish = async (data: Parameters<typeof prisma.meetMeeting.update>[0]["data"]) => {
    meeting = await prisma.meetMeeting.update({ where: { id: meetingId }, data: { status: "ready", ...data } });
    return { status: "ready", pending: 0, error: meeting.error };
  };

  const recs = await prisma.meetRecording.findMany({ where: { meetingId }, orderBy: [{ clockinId: "asc" }, { seq: "asc" }] });
  if (!meeting.liveNotes || recs.length === 0) return finish({ error: recs.length ? "" : "Nothing was recorded, so there's no transcript." });
  if (!transcriptionReady()) return finish({ error: "Transcription isn't switched on yet. Add the notes by hand below." });

  const room = meeting.kind === "room";
  let lastError = "";
  for (const r of recs.filter((x) => x.status === "uploaded" || x.status === "transcribing")) {
    if (Date.now() - started > budgetMs) break;
    try {
      const words = await transcribe(r.path, room);
      await prisma.meetRecording.update({ where: { id: r.id }, data: { status: "done", words } });
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      console.error(`[meet-notes] transcription failed for ${r.id}: ${lastError}`);
      await prisma.meetRecording.update({ where: { id: r.id }, data: { status: "failed" } });
    }
  }
  const after = await prisma.meetRecording.findMany({ where: { meetingId } });
  const pending = after.filter((x) => x.status === "uploaded" || x.status === "transcribing").length;
  if (pending) return { status: "ended", pending, error: "" };
  if (!after.some((x) => x.status === "done")) {
    // Every piece failed: say why, rather than "no speech was picked up".
    return finish({ error: `The recording couldn't be turned into text${lastError ? ` (${lastError})` : ""}. Add the notes by hand below.` });
  }

  const lines = mergeLines(after.filter((x) => x.status === "done").map((x) => ({ clockinId: x.clockinId, startMs: x.startMs, words: (x.words as Word[]) || [] })));
  const people = await activePeople().catch(() => []);
  const nameOfId = (id: number) => people.find((p) => p.id === id)?.name || "Someone";
  const label = (l: Line) => (room || l.clockinId === 0 ? `Speaker ${l.speaker + 1}` : firstNameOf(nameOfId(l.clockinId)));

  if (!summaryReady() || lines.length === 0) {
    return finish({ transcript: lines, error: lines.length ? "Summaries aren't switched on yet. Add the notes by hand below." : "No speech was picked up in the recording." });
  }

  try {
    const invited = await prisma.meetAttendee.findMany({ where: { meetingId } });
    const staff = people.filter((p) => invited.some((a) => a.clockinId === p.id)).map((p) => ({ id: p.id, name: p.name }));
    const out = await summarise(meeting.title, londonDate(meeting.startedAt || meeting.startsAt), lines, staff.length ? staff : people, room, label);
    const byName = new Map(people.map((p) => [p.name.toLowerCase(), p.id]));
    const firstOnly = new Map(people.map((p) => [firstNameOf(p.name).toLowerCase(), p.id]));
    for (const t of out.tasks) {
      const ownerId = byName.get(t.owner.toLowerCase()) ?? firstOnly.get(t.owner.toLowerCase());
      if (!ownerId || !t.title.trim()) continue; // unnamed tasks are left for the manager to add
      await prisma.meetTask.create({
        data: {
          title: t.title.trim().slice(0, 160), ownerId, dueDate: /^\d{4}-\d{2}-\d{2}$/.test(t.due) ? t.due : "", status: "suggested", meetingId,
          quote: t.quote.slice(0, 500), quoteMs: Number.isFinite(t.quote_ms) ? Math.max(0, Math.round(t.quote_ms)) : null,
          quoteBy: (() => { const l = lines.find((x) => x.ms === Math.round(t.quote_ms)); return l ? label(l) : ""; })(), createdBy: "Demi's notes",
        },
      });
    }
    const speakers: Record<string, number> = {};
    for (const s of out.speakers) {
      const id = byName.get(s.name.toLowerCase()) ?? firstOnly.get(s.name.toLowerCase());
      if (id) speakers[String(s.speaker)] = id;
    }
    const result = await finish({ transcript: lines, summary: out.summary, decisions: out.decisions, speakers: room ? speakers : {}, notesBy: "ai", error: "" });
    const told = invited.filter((a) => a.joinedAt || a.inRoom).map((a) => a.clockinId);
    await notifyPeople(told, { title: `Notes ready: ${meeting.title}`, body: "Summary, decisions and tasks from the meeting", url: `/meet?notes=${meetingId}`, tag: `notes-${meetingId}`, icon: "auto_awesome" }, { email: false }).catch(() => null);
    return result;
  } catch (e) {
    console.error(`[meet-notes] summary failed for ${meetingId}: ${e instanceof Error ? e.message : e}`);
    const why = e instanceof Error ? e.message : "";
    return finish({ transcript: lines, error: `The summary couldn't be written${why ? ` (${why.slice(0, 160)})` : ""}. The transcript is below; add the notes by hand.` });
  }
}
