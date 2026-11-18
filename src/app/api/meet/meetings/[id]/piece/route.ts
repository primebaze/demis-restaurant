import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeet } from "@/lib/meet-auth";
import { meetingFor, endIfOverLimit } from "@/lib/meet-meetings";
import { uploadUrl, isOurPath, storageReady } from "@/lib/meet-storage";
import { transcribePieceNow } from "@/lib/meet-notes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/**
 * Recording pieces: each device records its own microphone in short pieces and uploads
 * them straight to private storage while the meeting runs.
 *   { action: "url", ext }                              → a one-time upload URL
 *   { action: "done", path, seq, startMs, mime, room }  → saves the piece for the notes (returns its id)
 *   { action: "transcribe", id }                        → live captions for one saved piece
 */
export async function POST(req: Request, { params }: Ctx) {
  const me = await requireMeet();
  if (!me) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const { id } = await params;
  const found = await meetingFor(id, me);
  if (!found) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  const m = found.meeting;
  if (!m.liveNotes) return NextResponse.json({ error: "This meeting isn't recorded" }, { status: 400 });
  await endIfOverLimit(m).catch(() => false); // past its time limit: ended now, but the last pieces still count
  // Pieces still uploading when the meeting ends are accepted for 30 minutes.
  const open = m.status === "live" || (m.status === "ended" && m.endedAt && Date.now() - m.endedAt.getTime() < 30 * 60_000);
  if (!open) return NextResponse.json({ error: "Recording is closed" }, { status: 400 });
  if (!found.mine?.joinedAt && !me.manager) return NextResponse.json({ error: "Join first" }, { status: 403 });
  if (!storageReady()) return NextResponse.json({ error: "Recording storage isn't set up" }, { status: 503 });
  const body = await req.json().catch(() => ({}));

  if (body.action === "url") {
    const up = await uploadUrl(`rec/${m.id}`, "audio", String(body.ext || ""));
    return up ? NextResponse.json(up) : NextResponse.json({ error: "Recording storage isn't working right now" }, { status: 503 });
  }
  if (body.action === "done") {
    const seq = Number(body.seq);
    const startMs = Number(body.startMs);
    if (!isOurPath(body.path, `rec/${m.id}`) || !Number.isInteger(seq) || seq < 0 || !Number.isFinite(startMs) || startMs < 0) {
      return NextResponse.json({ error: "Bad piece" }, { status: 400 });
    }
    const room = !!body.room && me.manager && m.kind === "room";
    const rec = await prisma.meetRecording.create({
      data: { meetingId: m.id, clockinId: room ? 0 : me.person.id, seq, startMs: Math.round(startMs), path: body.path, mime: String(body.mime || "").slice(0, 60) },
    });
    // Saved. Transcribing is a separate request (action "transcribe") the phone sends without waiting,
    // so uploads, and ending the meeting, never wait for the transcription service.
    return NextResponse.json({ ok: true, id: rec.id });
  }
  if (body.action === "transcribe") {
    // Live captions: transcribe one piece now (about a minute behind the call). The notes pick up any left over.
    const rec = await prisma.meetRecording.findFirst({ where: { id: String(body.id || ""), meetingId: m.id } });
    if (rec) await transcribePieceNow(rec.id, m.kind === "room").catch(() => {});
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
