import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { shareJson } from "@/lib/shoot-share-auth";
export const dynamic = "force-dynamic";
type Context = { params: { id: string } };
const select = { token: true, enabled: true, version: true };
export async function GET(_req: Request, { params }: Context) {
  if ((await requireAdmin()).unauthorized)
    return shareJson({ error: "Sign in to manage sharing." }, 401);
  try {
    const plan = await prisma.shootPlan.findUnique({
      where: { id: params.id },
      select: { share: { select } },
    });
    return plan
      ? shareJson({ share: plan.share })
      : shareJson({ error: "Shoot plan not found." }, 404);
  } catch {
    return shareJson(
      { error: "Sharing settings could not be loaded. Try again." },
      503,
    );
  }
}
export async function PUT(req: Request, { params }: Context) {
  if ((await requireAdmin()).unauthorized)
    return shareJson({ error: "Sign in again to manage sharing." }, 401);
  if (!process.env.ADMIN_JWT_SECRET)
    return shareJson({ error: "Sharing is temporarily unavailable." }, 503);
  try {
    const raw = await req.text();
    if (raw.length > 1024)
      return shareJson({ error: "Invalid sharing settings." }, 400);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return shareJson({ error: "Invalid sharing settings." }, 400);
    }
    if (
      !body ||
      !Number.isSafeInteger(body.version) ||
      body.version < 0 ||
      typeof body.enabled !== "boolean"
    )
      return shareJson(
        { error: "Reload sharing settings before trying again." },
        400,
      );
    if (
      body.enabled &&
      (typeof body.pin !== "string" || !/^\d{6}$/.test(body.pin))
    )
      return shareJson({ error: "Enter a six-digit PIN." }, 400);
    const pinHash = body.enabled ? await hash(body.pin, 12) : undefined;
    if (!body.version) {
      if (!body.enabled)
        return shareJson({ error: "Sharing is already off." }, 400);
      if (
        !(await prisma.shootPlan.findUnique({
          where: { id: params.id },
          select: { id: true },
        }))
      )
        return shareJson({ error: "Shoot plan not found." }, 404);
      try {
        const share = await prisma.shootPlanShare.create({
          data: {
            planId: params.id,
            token: randomBytes(24).toString("hex"),
            pinHash: pinHash!,
          },
          select,
        });
        return shareJson({ share });
      } catch (error) {
        if ((error as { code?: string }).code === "P2002")
          return shareJson(
            { error: "Sharing changed in another tab. Reload its settings." },
            409,
          );
        throw error;
      }
    }
    const share = await prisma.$transaction(async (tx) => {
      const changed = await tx.shootPlanShare.updateMany({
        where: { planId: params.id, version: body.version },
        data: {
          enabled: body.enabled,
          ...(pinHash ? { pinHash } : {}),
          version: { increment: 1 },
          attemptCount: 0,
          windowStart: new Date(),
        },
      });
      if (!changed.count) return null;
      return tx.shootPlanShare.findUniqueOrThrow({
        where: { planId: params.id },
        select,
      });
    });
    return share
      ? shareJson({ share })
      : shareJson(
          { error: "Sharing changed in another tab. Reload its settings." },
          409,
        );
  } catch {
    return shareJson(
      {
        error:
          "Couldn’t confirm the sharing change. Reload settings before retrying.",
      },
      503,
    );
  }
}
