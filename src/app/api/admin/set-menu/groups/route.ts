import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
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
  if (!partySize || partySize < 1) return NextResponse.json({ error: "Party size must be at least 1" }, { status: 400 });

  // Generate unique random code — retry on collision
  let groupCode = "";
  for (let i = 0; i < 5; i++) {
    const candidate = randomBytes(4).toString("hex").toUpperCase(); // e.g. "A3KX9P2M"
    const existing = await prisma.setMenuGroup.findUnique({ where: { groupCode: candidate } });
    if (!existing) { groupCode = candidate; break; }
  }
  if (!groupCode) return NextResponse.json({ error: "Could not generate unique code" }, { status: 500 });

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
