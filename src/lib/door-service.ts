import { prisma } from "@/lib/prisma";
import {
  serviceDate, isVisitType, displayName, locationName, byTableNumber, parseAmountToPence,
} from "@/lib/door";

/**
 * Door check-in logic, shared by the admin view (/api/admin/door) and the
 * staff kiosk (/api/door). The two differ only in how they authenticate.
 */

function isUniqueViolation(e: unknown): boolean {
  return !!e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002";
}

const EMPTY_TOTALS = {
  diningCovers: 0, diningParties: 0, takeaway: 0, stillIn: 0,
  takingsPence: 0, diningTakingsPence: 0, takeawayTakingsPence: 0, billsEntered: 0, visits: 0,
};

/** The day's visits, ordered by table, plus the end-of-day totals. */
export async function listDay(locationSlug: string, dateParam: string | null) {
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : serviceDate();

  try {
    const rows = await prisma.guestVisit.findMany({
      where: { date, locationSlug },
      orderBy: { seq: "asc" },
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
      tableNo: v.tableNo,
      isBooking: v.isBooking,
      checkedInAt: v.checkedInAt,
      checkedOutAt: v.checkedOutAt,
      amountPence: v.amountPence,
      status: v.status,
    })).sort(byTableNumber);

    // Covers count people, not parties — takeaway is always one head.
    const dining = rows.filter((v) => v.visitType === "dining");
    const takeaway = rows.filter((v) => v.visitType === "takeaway");
    const sum = (list: typeof rows) => list.reduce((s, v) => s + (v.amountPence || 0), 0);

    return {
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
    };
  } catch {
    return {
      date, locationSlug, locationName: locationName(locationSlug),
      visits: [], totals: EMPTY_TOTALS, notMigrated: true,
    };
  }
}

type Created = { ok: true; visit: Record<string, unknown> } | { ok: false; error: string; status: number };

/** Check a guest or party in. */
export async function createVisit(locationSlug: string, body: Record<string, unknown>): Promise<Created> {
  const visitType = isVisitType(body.visitType) ? body.visitType : "dining";
  const name = String(body.name || "").trim().slice(0, 80);
  const phone = String(body.phone || "").trim().slice(0, 30);
  const email = String(body.email || "").trim().toLowerCase().slice(0, 120);
  // Takeaway is a single person with no table.
  const partySize = visitType === "takeaway"
    ? 1
    : Math.max(1, Math.min(30, Math.floor(Number(body.partySize) || 1)));
  const tableNo = visitType === "takeaway" ? "" : String(body.tableNo || "").trim().slice(0, 12);
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
        data: { date, locationSlug, seq, visitType, name, phone, email, partySize, tableNo, isBooking },
      });
      return {
        ok: true,
        visit: {
          id: row.id, seq: row.seq, label: displayName(row), visitType: row.visitType,
          partySize: row.partySize, tableNo: row.tableNo, checkedInAt: row.checkedInAt,
        },
      };
    } catch (e) {
      if (isUniqueViolation(e)) continue;
      throw e;
    }
  }
  return { ok: false, error: "Could not check in, please try again.", status: 503 };
}

/** Check out, reopen, or correct a visit. */
export async function updateVisit(id: string, body: Record<string, unknown>): Promise<Created> {
  const data: {
    status?: string; checkedOutAt?: Date | null; amountPence?: number | null;
    name?: string; phone?: string; email?: string; partySize?: number; tableNo?: string;
    visitType?: string; note?: string;
  } = {};

  if (body.action === "checkout") {
    data.status = "closed";
    data.checkedOutAt = new Date();
  } else if (body.action === "reopen") {
    data.status = "active";
    data.checkedOutAt = null;
  }

  if (body.amount !== undefined) {
    if (body.amount === "" || body.amount === null) data.amountPence = null;
    else {
      const pence = parseAmountToPence(String(body.amount));
      if (pence === null) return { ok: false, error: "Enter a valid amount", status: 400 };
      data.amountPence = pence;
    }
  }
  if (typeof body.name === "string") data.name = body.name.trim().slice(0, 80);
  if (typeof body.phone === "string") data.phone = body.phone.trim().slice(0, 30);
  if (typeof body.email === "string") data.email = body.email.trim().toLowerCase().slice(0, 120);
  if (typeof body.tableNo === "string") data.tableNo = body.tableNo.trim().slice(0, 12);
  if (typeof body.note === "string") data.note = body.note.slice(0, 200);
  if (body.partySize !== undefined) {
    data.partySize = Math.max(1, Math.min(30, Math.floor(Number(body.partySize) || 1)));
  }
  if (isVisitType(body.visitType)) data.visitType = body.visitType;

  if (Object.keys(data).length === 0) {
    return { ok: false, error: "Nothing to update", status: 400 };
  }

  const visit = await prisma.guestVisit.update({ where: { id }, data });
  return { ok: true, visit };
}

/** Remove a mistaken check-in. */
export async function deleteVisit(id: string) {
  await prisma.guestVisit.delete({ where: { id } });
}
