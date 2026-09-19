import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { requireAdmin } from "./admin-auth";
import {
  isShareUnlocked,
  shareJson,
  validShareToken,
} from "./shoot-share-auth";
import { validShootId } from "./shoot-plans";

type Access =
  { kind: "admin"; id: string } | { kind: "viewer" | "editor"; token: string };
class AccessError extends Error {
  constructor(public status: number) {
    super("Access unavailable");
  }
}
async function resolve(
  tx: Prisma.TransactionClient,
  access: Access,
  lock: boolean,
) {
  if (access.kind === "admin") {
    if ((await requireAdmin()).unauthorized) throw new AccessError(401);
    if (!validShootId(access.id)) throw new AccessError(404);
    return access.id;
  }
  if (!validShareToken(access.token)) throw new AccessError(404);
  const select = { planId: true, enabled: true, version: true };
  let share;
  if (lock && access.kind === "editor") {
    const rows = await tx.$queryRaw<
      { planId: string; enabled: boolean; version: number }[]
    >`
      SELECT "planId", "enabled", "version" FROM "ShootPlanEditorShare" WHERE "token" = ${access.token} FOR UPDATE`;
    share = rows[0];
  } else {
    share =
      access.kind === "editor"
        ? await tx.shootPlanEditorShare.findUnique({
            where: { token: access.token },
            select,
          })
        : await tx.shootPlanShare.findUnique({
            where: { token: access.token },
            select,
          });
  }
  if (!share?.enabled) throw new AccessError(404);
  if (!(await isShareUnlocked(access.token, share.version, access.kind)))
    throw new AccessError(401);
  return share.planId;
}
function failure(error: unknown) {
  if (error instanceof AccessError && error.status === 413)
    return shareJson(
      { error: "This shoot has reached its 120-image limit." },
      413,
    );
  if (error instanceof AccessError)
    return shareJson(
      { error: "Reference access is unavailable. Unlock this shoot again." },
      error.status,
    );
  return shareJson(
    { error: "Couldn’t load or save the image. Try again." },
    503,
  );
}
export async function getShootReference(req: Request, access: Access) {
  try {
    const id = new URL(req.url).searchParams.get("image") || "";
    if (!validShootId(id)) return shareJson({ error: "Image not found." }, 404);
    const asset = await prisma.$transaction(async (tx) => {
      const planId = await resolve(tx, access, false);
      return tx.shootReference.findFirst({
        where: { id, planId },
        select: { data: true, mimeType: true },
      });
    });
    if (!asset) return shareJson({ error: "Image not found." }, 404);
    return new Response(new Uint8Array(asset.data), {
      headers: {
        "Content-Type": asset.mimeType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, noarchive",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
export async function uploadShootReference(req: Request, access: Access) {
  if (access.kind === "viewer")
    return shareJson({ error: "Read-only access." }, 403);
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      if (
        new URL(origin).host !==
        (req.headers.get("host") || new URL(req.url).host)
      )
        return shareJson({ error: "Open this shoot to upload images." }, 403);
    } catch {
      return shareJson({ error: "Invalid request origin." }, 403);
    }
  }
  try {
    await prisma.$transaction((tx) => resolve(tx, access, false));
    const length = Number(req.headers.get("content-length") || 0);
    if (length > 3_200_000)
      return shareJson({ error: "Choose an image smaller than 3 MB." }, 413);
    const form = await req.formData();
    const file = form.get("file");
    const id =
      typeof form.get("id") === "string"
        ? String(form.get("id"))
        : randomUUID();
    if (
      !validShootId(id) ||
      !(file instanceof File) ||
      !file.size ||
      file.size > 3_000_000
    )
      return shareJson(
        { error: "Choose a JPG, PNG or WebP image smaller than 3 MB." },
        400,
      );
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      return shareJson({ error: "Choose a JPG, PNG or WebP image." }, 400);
    let data: Buffer;
    try {
      const source = Buffer.from(await file.arrayBuffer());
      const image = sharp(source, {
        limitInputPixels: 40_000_000,
        animated: false,
      });
      const metadata = await image.metadata();
      if (!["jpeg", "png", "webp"].includes(metadata.format || ""))
        throw new Error();
      data = await image
        .rotate()
        .resize({
          width: 1400,
          height: 1400,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 78 })
        .toBuffer();
      if (data.length > 500_000) throw new Error();
    } catch {
      return shareJson(
        {
          error:
            "This image could not be processed. Try a smaller JPG, PNG or WebP.",
        },
        400,
      );
    }
    await prisma.$transaction(async (tx) => {
      const planId = await resolve(tx, access, true);
      // Serialize the capacity check, including concurrent uploads from the same shoot.
      const plans = await tx.$queryRaw<
        { id: string }[]
      >`SELECT "id" FROM "ShootPlan" WHERE "id" = ${planId} FOR UPDATE`;
      if (!plans.length) throw new AccessError(404);
      const existing = await tx.shootReference.findUnique({
        where: { id },
        select: { planId: true },
      });
      if (existing) {
        if (existing.planId !== planId) throw new AccessError(409);
        return;
      }
      if ((await tx.shootReference.count({ where: { planId } })) >= 120)
        throw new AccessError(413);
      await tx.shootReference.create({
        data: {
          id,
          planId,
          data: new Uint8Array(data),
          mimeType: "image/webp",
        },
      });
    });
    return shareJson({ reference: { id, caption: "" } }, 201);
  } catch (error) {
    return failure(error);
  }
}
