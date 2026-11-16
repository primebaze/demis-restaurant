/**
 * Phone approvals for Demi's Meetings, shared by the meetings manager screens
 * and the bookings admin (which approves the very first manager phone).
 */
import { prisma } from "@/lib/prisma";

export type DeviceRow = {
  id: string;
  clockinId: number;
  staffName: string;
  label: string;
  status: string;
  signedIn: boolean;
  lastSeenAt: string;
  createdAt: string;
};

export async function listDevices(): Promise<{ pending: DeviceRow[]; approved: DeviceRow[] }> {
  const rows = await prisma.meetDevice.findMany({
    where: { status: { in: ["pending", "approved"] } },
    orderBy: [{ createdAt: "desc" }],
    take: 300,
  });
  const now = new Date();
  const map = (d: (typeof rows)[number]): DeviceRow => ({
    id: d.id,
    clockinId: d.clockinId,
    staffName: d.staffName,
    label: d.label,
    status: d.status,
    signedIn: !!d.sessionUntil && d.sessionUntil > now,
    lastSeenAt: d.lastSeenAt.toISOString(),
    createdAt: d.createdAt.toISOString(),
  });
  return {
    // Waiting until a manager decides (whatever the phone does meanwhile); very old ones drop off after 14 days.
    pending: rows.filter((d) => d.status === "pending" && now.getTime() - d.createdAt.getTime() < 14 * 24 * 60 * 60_000).map(map),
    approved: rows.filter((d) => d.status === "approved").map(map),
  };
}

/** approve / decline a waiting phone, or revoke (sign out of) an approved one. */
export async function decideDevice(id: string, action: string, by: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const device = id ? await prisma.meetDevice.findUnique({ where: { id } }) : null;
  if (!device) return { ok: false, error: "Phone not found" };

  if (action === "approve" || action === "decline") {
    if (device.status !== "pending") return { ok: false, error: "That phone isn't waiting any more" };
    await prisma.meetDevice.update({
      where: { id },
      data: { status: action === "approve" ? "approved" : "declined", decidedBy: by.slice(0, 80), decidedAt: new Date() },
    });
    return { ok: true };
  }
  if (action === "revoke") {
    await prisma.meetDevice.update({
      where: { id },
      data: { status: "revoked", sessionUntil: null, decidedBy: by.slice(0, 80), decidedAt: new Date() },
    });
    return { ok: true };
  }
  return { ok: false, error: "Unknown action" };
}
