import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";

const VALID_APPETISERS = ["Puff Puff", "Samosa", "Spring Rolls"];
const VALID_STARTERS = ["Salad", "Assorted Goat Meat Pepper Soup", "Gizzdodo", "Beef Suya", "Lamb Suya", "Moi Moi", "Nil"];
const VALID_MAINS = ["Jollof Rice", "Fried Rice", "Eforiro with Pounded Yam", "Egusi with Pounded Yam", "Amala with Abula", "White Rice and Ayamase", "Nil"];
const VALID_PROTEINS = ["Chicken", "Beef", "Goat Meat", "Fish", "Nil"];
const VALID_DESSERTS = ["Ice Cream Xplosion", "Toffee Pudding", "Nil"];

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

  let body: {
    guestName: string;
    appetiser: string;
    starter: string;
    main: string;
    protein: string;
    dessert: string;
    allergies?: string;
    website?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Honeypot
  if (body.website) return NextResponse.json({ ok: true });

  const { guestName, appetiser, starter, main, protein, dessert, allergies = "" } = body;

  if (!guestName?.trim() || guestName.trim().length > 200)
    return NextResponse.json({ error: "Please enter your name" }, { status: 400 });
  if (!VALID_APPETISERS.includes(appetiser))
    return NextResponse.json({ error: "Please choose a valid appetiser" }, { status: 400 });
  if (!starter || !VALID_STARTERS.includes(starter))
    return NextResponse.json({ error: "Please choose a valid starter" }, { status: 400 });
  if (!main || !VALID_MAINS.includes(main))
    return NextResponse.json({ error: "Please choose a valid main" }, { status: 400 });
  if (!protein || !VALID_PROTEINS.includes(protein))
    return NextResponse.json({ error: "Please choose a valid protein" }, { status: 400 });
  if (!dessert || !VALID_DESSERTS.includes(dessert))
    return NextResponse.json({ error: "Please choose a valid dessert" }, { status: 400 });

  const group = await prisma.setMenuGroup.findUnique({
    where: { groupCode },
    include: { _count: { select: { selections: true } } },
  });

  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  if (group.status === "cancelled") return NextResponse.json({ error: "This event has been cancelled" }, { status: 410 });
  if (group._count.selections >= group.partySize)
    return NextResponse.json({ error: "All selections for this event have been received" }, { status: 409 });

  const selection = await prisma.setMenuSelection.create({
    data: {
      groupId: group.id,
      guestName: guestName.trim(),
      appetiser,
      starter,
      main,
      protein,
      dessert,
      allergies: allergies.trim().slice(0, 500),
    },
  });

  return NextResponse.json({ ok: true, selection }, { status: 201 });
}
