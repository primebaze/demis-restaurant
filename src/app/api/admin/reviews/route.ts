import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
export const dynamic = "force-dynamic";

const clampRating = (r: unknown) => Math.min(5, Math.max(1, parseInt(String(r)) || 5));

/** GET /api/admin/reviews — all reviews (admin). */
export async function GET() {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reviews = await prisma.review.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ reviews });
}

/** POST /api/admin/reviews — create a review. */
export async function POST(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const author = String(body.author || "").trim().slice(0, 80);
  const text = String(body.body || "").trim().slice(0, 1000);
  const location = String(body.location || "").trim().slice(0, 80);
  if (!author) return NextResponse.json({ error: "Add a reviewer name" }, { status: 400 });
  if (!text) return NextResponse.json({ error: "Add the review text" }, { status: 400 });

  const review = await prisma.review.create({
    data: { author, body: text, location, rating: clampRating(body.rating) },
  });
  return NextResponse.json({ review }, { status: 201 });
}
