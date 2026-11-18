import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeet } from "@/lib/meet-auth";
import { readUrls, isOurPath, removeFiles } from "@/lib/meet-storage";

export const dynamic = "force-dynamic";

/** GET: the handbook and documents, with short-lived links to open them. */
export async function GET() {
  const me = await requireMeet();
  if (!me) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const docs = await prisma.meetDoc.findMany({ orderBy: { title: "asc" } });
  const urls = await readUrls(docs.map((d) => d.path));
  return NextResponse.json(
    { docs: docs.map((d) => ({ id: d.id, title: d.title, mime: d.mime, size: d.size, url: urls.get(d.path) || "", at: d.createdAt.toISOString() })) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** POST (managers) { action: "add", title, path, mime, size } or { action: "delete", id } */
export async function POST(req: Request) {
  const me = await requireMeet(true);
  if (!me) return NextResponse.json({ error: "Managers only" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (body.action === "add") {
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
    if (!title || !isOurPath(body.path, "docs")) return NextResponse.json({ error: "Add a name and a file" }, { status: 400 });
    const doc = await prisma.meetDoc.create({ data: { title, path: body.path, mime: String(body.mime || "").slice(0, 100), size: Math.max(0, Number(body.size) || 0), addedBy: me.person.name } });
    return NextResponse.json({ ok: true, id: doc.id });
  }
  if (body.action === "delete") {
    const doc = await prisma.meetDoc.findUnique({ where: { id: String(body.id || "") } });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.meetDoc.delete({ where: { id: doc.id } });
    await removeFiles([doc.path]).catch(() => {});
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
