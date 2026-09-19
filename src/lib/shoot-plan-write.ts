import type { Prisma } from "@prisma/client";
import { parseShootDraft, ShootValidationError } from "./shoot-plans";

// Both admin and collaborator writes use the same validation and atomic version check.
export async function updateShootPlan(
  tx: Prisma.TransactionClient,
  id: string,
  body: Record<string, unknown>,
) {
  if (!Number.isSafeInteger(body.version) || Number(body.version) < 1)
    throw new ShootValidationError(
      "Reload the latest plan before saving.",
      "title",
    );
  const current = await tx.shootPlan.findUnique({
    where: { id },
    select: {
      videos: true,
      weekStart: true,
      activities: true,
      visualDirection: true,
      outputFormat: true,
      shots: { select: { id: true, videoId: true } },
    },
  });
  if (!current) return null;
  // Older editor tabs must preserve fields and shot grouping they do not know about.
  const previousGroups = new Map(
    current.shots.map((shot) => [shot.id, shot.videoId]),
  );
  const previousVideos = new Map(
    (Array.isArray(current.videos) ? current.videos : []).map((value) => {
      const video = value as { id: string; activityId?: string };
      return [video.id, video.activityId || ""];
    }),
  );
  const merged = {
    ...current,
    ...body,
    videos: Array.isArray(body.videos)
      ? body.videos.map((video) =>
          video && typeof video === "object"
            ? { activityId: previousVideos.get(video.id) || "", ...video }
            : video,
        )
      : (body.videos ?? current.videos),
    shots: Array.isArray(body.shots)
      ? body.shots.map((shot) =>
          shot && typeof shot === "object"
            ? { videoId: previousGroups.get(shot.id) || "", ...shot }
            : shot,
        )
      : body.shots,
  };
  const { shots, checklist, ...data } = parseShootDraft(merged);
  const referenceIds = Array.from(
    new Set(
      data.videos.flatMap((video) => video.references.map((ref) => ref.id)),
    ),
  );
  if (
    referenceIds.length &&
    (await tx.shootReference.count({
      where: { planId: id, id: { in: referenceIds } },
    })) !== referenceIds.length
  )
    throw new ShootValidationError(
      "Upload reference images to this shoot before saving.",
      "videos",
    );
  const changed = await tx.shootPlan.updateMany({
    where: { id, version: Number(body.version) },
    data: {
      ...data,
      ...(body.checklist === undefined ? {} : { checklist }),
      version: { increment: 1 },
    },
  });
  if (!changed.count) return null;
  await tx.shootShot.deleteMany({ where: { planId: id } });
  if (shots.length)
    await tx.shootShot.createMany({
      data: shots.map((shot, sortOrder) => ({
        ...shot,
        planId: id,
        sortOrder,
      })),
    });
  return tx.shootPlan.findUniqueOrThrow({
    where: { id },
    include: { shots: { orderBy: { sortOrder: "asc" } } },
  });
}
export const shootConflict =
  "This plan changed since you opened it. Your edits are still here. Copy them before reloading the latest version.";
