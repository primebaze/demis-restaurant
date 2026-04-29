import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { sendAdminNewSetMenuGroup, sendOrganizerSetMenuConfirmation } from "@/lib/email";
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.demisrestaurant.co.uk";

/** GET /api/admin/set-menu/groups — list all groups */
export async function GET(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;

  const where = status ? { status } : {};

  const [groups, total] = await Promise.all([
    prisma.setMenuGroup.findMany({
      where,
      include: { selections: { orderBy: { createdAt: "asc" } } },
      orderBy: { groupCode: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.setMenuGroup.count({ where }),
  ]);

  return NextResponse.json({ groups, total, totalPages: Math.ceil(total / limit) });
}

/** POST /api/admin/set-menu/groups — admin creates a new set menu group */
export async function POST(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    organizerName: string;
    organizerEmail?: string;
    organizerPhone?: string;
    date: string;
    partySize: number;
    locationSlug?: string;
    notes?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { organizerName, organizerEmail = "", organizerPhone = "", date, partySize, locationSlug = "cricklewood", notes = "" } = body;

  if (!organizerName?.trim()) return NextResponse.json({ error: "Organiser name is required" }, { status: 400 });
  if (!date?.match(/^\d{4}-\d{2}-\d{2}$/)) return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  if (!partySize || partySize < 1 || partySize > 500) return NextResponse.json({ error: "Party size must be 1–500" }, { status: 400 });

  // Generate sequential group code
  const count = await prisma.setMenuGroup.count();
  const groupCode = `SM-${String(count + 1).padStart(4, "0")}`;

  const group = await prisma.setMenuGroup.create({
    data: {
      groupCode,
      organizerName: organizerName.trim().slice(0, 200),
      organizerEmail: organizerEmail.trim().slice(0, 200),
      organizerPhone: organizerPhone.trim().slice(0, 50),
      date,
      partySize,
      locationSlug,
      notes: notes.trim().slice(0, 1000),
    },
  });

  const guestSelectionUrl = `${SITE_URL}/set-menu/${groupCode}`;

  // Fire emails (non-blocking)
  sendAdminNewSetMenuGroup({
    groupCode,
    organizerName: group.organizerName,
    organizerEmail: group.organizerEmail,
    organizerPhone: group.organizerPhone,
    date: group.date,
    partySize: group.partySize,
    locationSlug: group.locationSlug,
    guestSelectionUrl,
  }).catch(console.error);

  if (organizerEmail) {
    sendOrganizerSetMenuConfirmation({
      organizerName: group.organizerName,
      organizerEmail: group.organizerEmail,
      groupCode,
      date: group.date,
      partySize: group.partySize,
      locationSlug: group.locationSlug,
      guestSelectionUrl,
    }).catch(console.error);
  }

  return NextResponse.json({ group, guestSelectionUrl }, { status: 201 });
}
