import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import {
  parseShootDraft,
  startOfWeek,
  SHOOT_STATUSES,
  ShootValidationError,
  validShootId,
} from "@/lib/shoot-plans";
import { readShootBody, shootApiError } from "@/lib/shoot-plan-api";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if ((await requireAdmin()).unauthorized)
    return NextResponse.json(
      { error: "Please sign in to view shoot plans." },
      { status: 401 },
    );
  try {
    const query = new URL(req.url).searchParams;
    const status = query.get("status") || "";
    const week = query.get("week") || "";
    if (
      week &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(week) || startOfWeek(week) !== week)
    )
      throw new ShootValidationError("Choose a valid week.", "weekStart");
    const weekEnd = week ? new Date(`${week}T12:00:00Z`) : null;
    if (weekEnd) weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    const where = {
      ...(Object.hasOwn(SHOOT_STATUSES, status) ? { status } : {}),
      ...(week
        ? {
            OR: [
              { weekStart: week },
              {
                weekStart: "",
                date: { gte: week, lte: weekEnd!.toISOString().slice(0, 10) },
              },
            ],
          }
        : {}),
    };
    const requested = Math.max(
      1,
      Math.min(100_000, Math.floor(Number(query.get("page")) || 1)),
    );
    const total = await prisma.shootPlan.count({ where });
    const pages = Math.max(1, Math.ceil(total / 12));
    const page = Math.min(requested, pages);
    const rows = await prisma.shootPlan.findMany({
      where,
      orderBy: [{ weekStart: "desc" }, { date: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * 12,
      take: 12,
      include: { shots: { select: { captured: true } } },
    });
    const plans = rows.map(({ shots, ...plan }) => ({
      ...plan,
      shotCount: shots.length,
      capturedCount: shots.filter((s) => s.captured).length,
    }));
    return NextResponse.json({ plans, total, page, pages });
  } catch (error) {
    return shootApiError(error);
  }
}

export async function POST(req: Request) {
  if ((await requireAdmin()).unauthorized)
    return NextResponse.json(
      { error: "Your session has expired. Sign in again, then retry saving." },
      { status: 401 },
    );
  try {
    const body = await readShootBody(req);
    if (!validShootId(body.id))
      throw new ShootValidationError(
        "The plan ID is invalid. Reload and try again.",
        "title",
      );
    const { shots, ...data } = parseShootDraft(body);
    if (data.videos.some((video) => video.references.length))
      throw new ShootValidationError(
        "Save the shoot before uploading reference images.",
        "videos",
      );
    // A repeated creation request returns the already-created resource.
    const plan = await prisma.shootPlan.upsert({
      where: { id: body.id },
      update: {},
      create: {
        id: body.id,
        ...data,
        shots: {
          create: shots.map((shot, sortOrder) => ({ ...shot, sortOrder })),
        },
      },
      include: { shots: { orderBy: { sortOrder: "asc" } } },
    });
    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    return shootApiError(error);
  }
}
