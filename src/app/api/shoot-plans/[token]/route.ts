import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  isShareUnlocked,
  SHARE_SESSION_SECONDS,
  shareCookieName,
  shareCookiePath,
  shareJson,
  signShareSession,
  validShareToken,
} from "@/lib/shoot-share-auth";
export const dynamic = "force-dynamic";
type Context = { params: { token: string } };
const unavailable = () =>
  shareJson(
    {
      error: "This link is unavailable. Ask the organiser for a current link.",
    },
    404,
  );
async function findShare(token: string) {
  if (!validShareToken(token)) return null;
  return prisma.shootPlanShare.findUnique({
    where: { token },
    select: { planId: true, pinHash: true, version: true, enabled: true },
  });
}
export async function GET(_req: Request, { params: { token } }: Context) {
  try {
    const share = await findShare(token);
    if (!share?.enabled) return unavailable();
    if (!(await isShareUnlocked(token, share.version)))
      return shareJson(
        { error: "Enter the PIN to view this shoot plan." },
        401,
      );
    // Explicit public projection: no sharing secrets, admin IDs, or write capability.
    const plan = await prisma.shootPlan.findUnique({
      where: { id: share.planId },
      select: {
        title: true,
        weekStart: true,
        activities: true,
        date: true,
        time: true,
        location: true,
        objective: true,
        notes: true,
        checklist: true,
        videos: true,
        visualDirection: true,
        outputFormat: true,
        status: true,
        updatedAt: true,
        shots: {
          orderBy: { sortOrder: "asc" },
          select: {
            videoId: true,
            title: true,
            description: true,
            format: true,
            preparation: true,
            assignee: true,
            referenceUrl: true,
            captured: true,
          },
        },
      },
    });
    return plan ? shareJson({ plan }) : unavailable();
  } catch {
    return shareJson(
      { error: "The shoot plan is unavailable right now. Try again." },
      503,
    );
  }
}
export async function POST(req: Request, { params: { token } }: Context) {
  try {
    if (!process.env.ADMIN_JWT_SECRET)
      return shareJson(
        { error: "Access is temporarily unavailable. Try again later." },
        503,
      );
    const raw = await req.text();
    if (raw.length > 256)
      return shareJson({ error: "Enter a six-digit PIN." }, 400);
    let pin: unknown;
    try {
      pin = JSON.parse(raw)?.pin;
    } catch {
      return shareJson({ error: "Enter a six-digit PIN." }, 400);
    }
    if (typeof pin !== "string" || !/^\d{6}$/.test(pin))
      return shareJson({ error: "Enter a six-digit PIN." }, 400);
    const share = await findShare(token);
    if (!share?.enabled) return unavailable();
    // Atomic, database-backed attempt budget: shared across serverless instances.
    // Counts all attempts (including successful ones), so concurrency cannot bypass it.
    const budget = await prisma.$queryRaw<{ planId: string }[]>`
      UPDATE "ShootPlanShare" SET
        "attemptCount" = CASE WHEN "windowStart" <= NOW() - INTERVAL '10 minutes' THEN 1 ELSE "attemptCount" + 1 END,
        "windowStart" = CASE WHEN "windowStart" <= NOW() - INTERVAL '10 minutes' THEN NOW() ELSE "windowStart" END
      WHERE "token" = ${token} AND "version" = ${share.version} AND "enabled" = true
        AND ("windowStart" <= NOW() - INTERVAL '10 minutes' OR "attemptCount" < 10)
      RETURNING "planId"`;
    if (!budget.length) {
      const response = shareJson(
        {
          error:
            "Too many PIN attempts for this link. Try again in 10 minutes.",
        },
        429,
      );
      response.headers.set("Retry-After", "600");
      return response;
    }
    if (!(await compare(pin, share.pinHash)))
      return shareJson(
        { error: "Incorrect PIN. Check with the organiser and try again." },
        401,
      );
    // A PIN rotation during verification must not mint a valid session for the new version.
    const current = await findShare(token);
    if (!current?.enabled || current.version !== share.version)
      return shareJson(
        { error: "Access changed. Ask the organiser for the latest PIN." },
        401,
      );
    const response = shareJson({ ok: true });
    response.cookies.set(
      shareCookieName(token),
      signShareSession(token, share.version),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: shareCookiePath(token),
        maxAge: SHARE_SESSION_SECONDS,
      },
    );
    return response;
  } catch {
    return shareJson(
      { error: "Couldn’t unlock the plan. Please try again." },
      503,
    );
  }
}
export async function DELETE(_req: Request, { params: { token } }: Context) {
  if (!validShareToken(token)) return unavailable();
  const response = shareJson({ ok: true });
  response.cookies.set(shareCookieName(token), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: shareCookiePath(token),
    maxAge: 0,
  });
  return response;
}
