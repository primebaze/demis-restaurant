import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import {
  serviceDate, isDoorLocation, isVisitType, displayName, locationName,
} from "@/lib/door";
export const dynamic = "force-dynamic";

function isUniqueViolation(e: unknown): boolean {
  return !!e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002";
}

/** GET /api/admin/door?location=slug&date=YYYY-MM-DD — the day's visits and totals. */
export async function GET(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const locationSlug = searchParams.get("location") || "";
  if (!isDoorLocation(locationSlug)) {
    return NextResponse.json({ error: "Unknown location" }, { status: 400 });
  }
  const param = searchParams.get("date");
  const date = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : serviceDate();

  try {
    const rows = await prisma.guestVisit.findMany({
      where: { date, locationSlug },
      orderBy: { seq: "desc" },
    });

    const visits = rows.map((v) => ({
      id: v.id,
      seq: v.seq,
      label: displayName(v),
      hasDetails: !!(v.name || v.phone || v.email),
      name: v.name,
      phone: v.phone,
      email: v.email,
      visitType: v.visitType,
      partySize: v.partySize,
      isBooking: v.isBooking,
      checkedInAt: v.checkedInAt,
      checkedOutAt: v.checkedOutAt,
      amountPence: v.amountPence,
      status: v.status,
    }));

    // Covers count people, not parties — takeaway is always one head.
    const dining = rows.filter((v) => v.visitType === "dining");
    const takeaway = rows.filter((v) => v.visitType === "takeaway");
    const sum = (list: typeof rows) => list.reduce((s, v) => s + (v.amountPence || 0), 0);

    return NextResponse.json({
      date,
      locationSlug,
      locationName: locationName(locationSlug),
      visits,
      totals: {
        diningCovers: dining.reduce((s, v) => s + v.partySize, 0),
        diningParties: dining.length,
        takeaway: takeaway.length,
        stillIn: rows.filter((v) => v.status === "active").length,
        takingsPence: sum(rows),
        diningTakingsPence: sum(dining),
        takeawayTakingsPence: sum(takeaway),
        billsEntered: rows.filter((v) => v.amountPence != null).length,
        visits: rows.length,
      },
    });
  } catch {
    return NextResponse.json({
      date, locationSlug, locationName: locationName(locationSlug), visits: [],
      totals: { diningCovers: 0, diningParties: 0, takeaway: 0, stillIn: 0, takingsPence: 0, diningTakingsPence: 0, takeawayTakingsPence: 0, billsEntered: 0, visits: 0 },
      notMigrated: true,
    });
  }
}

/** POST /api/admin/door — check a guest or party in. */
export async function POST(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const locationSlug = String(body.location || "");
  if (!isDoorLocation(locationSlug)) {
    return NextResponse.json({ error: "Unknown location" }, { status: 400 });
  }
  const visitType = isVisitType(body.visitType) ? body.visitType : "dining";
  const name = String(body.name || "").trim().slice(0, 80);
  const phone = String(body.phone || "").trim().slice(0, 30);
  const email = String(body.email || "").trim().toLowerCase().slice(0, 120);
  // Takeaway is a single person; dining can be a table.
  const partySize = visitType === "takeaway"
    ? 1
    : Math.max(1, Math.min(30, Math.floor(Number(body.partySize) || 1)));
  const isBooking = !!body.isBooking;
  const date = serviceDate();

  // seq is per day+location so an unnamed guest reads as "Customer 3".
  // The unique constraint stops two simultaneous taps taking the same number.
  for (let attempt = 0; attempt < 12; attempt++) {
    const last = await prisma.guestVisit.findFirst({
      where: { date, locationSlug },
      orderBy: { seq: "desc" },
      select: { seq: true },
    });
    const seq = (last?.seq || 0) + 1;
    try {
      const row = await prisma.guestVisit.create({
        data: { date, locationSlug, seq, visitType, name, phone, email, partySize, isBooking },
      });
      return NextResponse.json({
        id: row.id, seq: row.seq, label: displayName(row), visitType: row.visitType,
        partySize: row.partySize, checkedInAt: row.checkedInAt,
      });
    } catch (e) {
      if (isUniqueViolation(e)) continue;
      throw e;
    }
  }
  return NextResponse.json({ error: "Could not check in, please try again." }, { status: 503 });
}
