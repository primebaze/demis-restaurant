import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sendAdminGuestSelection } from "@/lib/email";
export const dynamic = "force-dynamic";

const VALID_APPETISERS = ["Puff Puff", "Samosa", "Spring Rolls"];

/** POST /api/set-menu/groups/[code]/selections — guest submits their menu choice */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const groupCode = code.toUpperCase();

  const group = await prisma.setMenuGroup.findUnique({
    where: { groupCode },
    include: { selections: { orderBy: { createdAt: "asc" } } },
  });

  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  return NextResponse.json({ selections: group.selections });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, { maxRequests: 3, windowMs: 60_000 });
  if (!rl.success) return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });

  const { code } = await params;
  const groupCode = code.toUpperCase();

  let body: { guestName: string; appetiser: string; website?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Honeypot
  if (body.website) return NextResponse.json({ ok: true });

  const { guestName, appetiser } = body;

  if (!guestName?.trim() || guestName.trim().length > 200) {
    return NextResponse.json({ error: "Please enter your name" }, { status: 400 });
  }
  if (!VALID_APPETISERS.includes(appetiser)) {
    return NextResponse.json({ error: "Please choose a valid appetiser" }, { status: 400 });
  }

  const group = await prisma.setMenuGroup.findUnique({
    where: { groupCode },
    include: { _count: { select: { selections: true } } },
  });

  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  if (group.status === "cancelled") return NextResponse.json({ error: "This event has been cancelled" }, { status: 410 });
  if (group._count.selections >= group.partySize) {
    return NextResponse.json({ error: "All selections for this event have been received" }, { status: 409 });
  }

  const selection = await prisma.setMenuSelection.create({
    data: {
      groupId: group.id,
      guestName: guestName.trim(),
      appetiser,
    },
  });

  // Notify admin of new guest selection (non-blocking)
  sendAdminGuestSelection({
    groupCode,
    guestName: selection.guestName,
    appetiser: selection.appetiser,
    date: group.date,
    organizerName: group.organizerName,
    selectionNumber: group._count.selections + 1,
    totalExpected: group.partySize,
  }).catch(console.error);

  return NextResponse.json({ ok: true, selection }, { status: 201 });
}
