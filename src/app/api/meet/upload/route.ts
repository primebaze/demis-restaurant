import { NextResponse } from "next/server";
import { requireMeet } from "@/lib/meet-auth";
import { uploadUrl, storageReady } from "@/lib/meet-storage";

export const dynamic = "force-dynamic";

// Which folders each person may put files in, and what kind of file.
const FOLDERS: Record<string, { kind: "photo" | "doc" | "audio"; manager: boolean }> = {
  tasks: { kind: "photo", manager: false },
  reports: { kind: "photo", manager: false },
  news: { kind: "photo", manager: true },
  docs: { kind: "doc", manager: true },
};

/** POST { folder, ext } → a one-time upload URL straight to private storage. */
export async function POST(req: Request) {
  const me = await requireMeet();
  if (!me) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  if (!storageReady()) return NextResponse.json({ error: "File uploads aren't switched on yet" }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const f = FOLDERS[String(body.folder || "")];
  if (!f) return NextResponse.json({ error: "Unknown folder" }, { status: 400 });
  if (f.manager && !me.manager) return NextResponse.json({ error: "Managers only" }, { status: 403 });
  const up = await uploadUrl(body.folder, f.kind, String(body.ext || ""));
  if (!up) return NextResponse.json({ error: "That type of file can't be added" }, { status: 400 });
  return NextResponse.json(up);
}
