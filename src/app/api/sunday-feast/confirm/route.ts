import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { prettyDate } from "@/lib/saturday-brunch";
export const dynamic = "force-dynamic";

/** POST { token }: a guest confirms they're coming to the Sunday Feast. Token-gated, no login. */
export async function POST(req: Request) {
  const { token } = await req.json().catch(() => ({ token: "" }));
  const t = String(token || "").trim();
  if (!t) return NextResponse.json({ error: "Invalid link" }, { status: 400 });

  const booking = await prisma.saturdayBrunchBooking.findFirst({
    where: { confirmToken: t },
    select: { id: true, name: true, date: true, status: true, confirmedAt: true },
  });
  if (!booking || booking.status === "cancelled") {
    return NextResponse.json({ error: "This reservation could not be found." }, { status: 404 });
  }

  const already = !!booking.confirmedAt;
  if (!already) {
    await prisma.saturdayBrunchBooking.update({
      where: { id: booking.id },
      data: { confirmedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true, already, name: booking.name, prettyDate: prettyDate(booking.date) });
}
