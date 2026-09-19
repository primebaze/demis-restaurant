import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { updateShootPlan, shootConflict } from "@/lib/shoot-plan-write";
import { readShootBody, shootApiError } from "@/lib/shoot-plan-api";
export const dynamic = "force-dynamic";
type Context = { params: { id: string } };
const include = { shots: { orderBy: { sortOrder: "asc" as const } } };

export async function GET(_req: Request, { params }: Context) {
  if ((await requireAdmin()).unauthorized)
    return NextResponse.json(
      { error: "Please sign in to view this shoot plan." },
      { status: 401 },
    );
  try {
    const plan = await prisma.shootPlan.findUnique({
      where: { id: params.id },
      include,
    });
    return plan
      ? NextResponse.json({ plan })
      : NextResponse.json(
          { error: "This shoot plan could not be found." },
          { status: 404 },
        );
  } catch (error) {
    return shootApiError(error);
  }
}
export async function PATCH(req: Request, { params }: Context) {
  if ((await requireAdmin()).unauthorized)
    return NextResponse.json(
      { error: "Your session has expired. Sign in again, then retry saving." },
      { status: 401 },
    );
  try {
    const body = await readShootBody(req);
    const plan = await prisma.$transaction((tx) =>
      updateShootPlan(tx, params.id, body),
    );
    if (!plan)
      return NextResponse.json(
        {
          error: shootConflict,
        },
        { status: 409 },
      );
    return NextResponse.json({ plan });
  } catch (error) {
    return shootApiError(error);
  }
}

export async function DELETE(req: Request, { params }: Context) {
  if ((await requireAdmin()).unauthorized)
    return NextResponse.json(
      { error: "Please sign in to delete this shoot plan." },
      { status: 401 },
    );
  try {
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host !== req.headers.get("host"))
      return NextResponse.json(
        { error: "Request not allowed." },
        { status: 403 },
      );
    const body = await readShootBody(req);
    if (!Number.isSafeInteger(body.version) || Number(body.version) < 1)
      return NextResponse.json(
        { error: "Reload the latest plan before deleting." },
        { status: 400 },
      );
    // One atomic version check; related shots, references and links cascade.
    const result = await prisma.shootPlan.deleteMany({
      where: { id: params.id, version: Number(body.version) },
    });
    if (!result.count) {
      const existing = await prisma.shootPlan.findUnique({
        where: { id: params.id },
        select: { id: true },
      });
      if (existing)
        return NextResponse.json({ error: shootConflict }, { status: 409 });
      // Retrying a successful delete remains successful.
    }
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return shootApiError(error);
  }
}
