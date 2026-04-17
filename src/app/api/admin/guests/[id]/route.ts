import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
export const dynamic = "force-dynamic";


/**
 * GET /api/admin/guests/[id] — Guest profile with full history
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const guest = await prisma.guest.findUnique({
    where: { id },
    include: {
      bookings: {
        include: {
          location: true,
          timeSlot: true,
          addOns: { include: { addOn: true } },
          changes: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { date: "desc" },
      },
      visits: { orderBy: { visitDate: "desc" } },
    },
  });

  if (!guest) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  return NextResponse.json({
    guest: {
      id: guest.id,
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      tags: guest.tags,
      notes: guest.notes,
      createdAt: guest.createdAt,
      bookings: guest.bookings.map((b) => ({
        id: b.id,
        confirmationCode: b.confirmationCode,
        location: b.location.name,
        date: b.date,
        time: b.time,
        slot: `${b.timeSlot.startTime} – ${b.timeSlot.endTime}`,
        partySize: b.partySize,
        status: b.status,
        source: b.source,
        notes: b.notes,
        depositAmountPence: b.depositAmountPence,
        depositStatus: b.depositStatus,
        addOns: b.addOns.map((a) => ({ name: a.addOn.name, pricePence: a.addOn.pricePence })),
        changes: b.changes,
        createdAt: b.createdAt,
      })),
      visits: guest.visits.map((v) => ({
        id: v.id,
        visitDate: v.visitDate,
        spendPence: v.spendPence,
        notes: v.notes,
        createdAt: v.createdAt,
      })),
      totalBookings: guest.bookings.length,
      totalVisits: guest.visits.length,
      totalSpendPence: guest.visits.reduce((sum, v) => sum + v.spendPence, 0),
      noShows: guest.bookings.filter((b) => b.status === "no_show").length,
    },
  });
}
