import { prisma } from "@/lib/prisma";

/**
 * Master switch for Saturday brunch bookings, set from the admin page.
 * Separate from the per-Saturday sold-out / hide settings: when this is off,
 * no Saturday can be booked at all.
 *
 * Stored as "off" when closed. Anything else (including no row yet) means open,
 * so bookings stay on unless an admin deliberately turns them off.
 */
const KEY = "brunch_bookings_open";

export async function brunchBookingsOpen(): Promise<boolean> {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: KEY } });
    return row?.value !== "off";
  } catch {
    return true;
  }
}

export async function setBrunchBookingsOpen(open: boolean): Promise<void> {
  const value = open ? "on" : "off";
  await prisma.appSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value },
    update: { value },
  });
}
