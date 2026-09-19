-- Additive schema only; preserves existing plans and shots. No sample content.
BEGIN;
ALTER TABLE "ShootPlan" ADD COLUMN IF NOT EXISTS "visualDirection" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ShootPlan" ADD COLUMN IF NOT EXISTS "outputFormat" TEXT NOT NULL DEFAULT 'Vertical 9:16';
ALTER TABLE "ShootPlan" ADD COLUMN IF NOT EXISTS "videos" JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "ShootShot" ADD COLUMN IF NOT EXISTS "videoId" TEXT NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS "ShootReference" (
 "id" TEXT PRIMARY KEY,
 "planId" TEXT NOT NULL REFERENCES "ShootPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "data" BYTEA NOT NULL,
 "mimeType" TEXT NOT NULL DEFAULT 'image/webp',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ShootReference_planId_idx" ON "ShootReference"("planId");
ALTER TABLE "ShootReference" ENABLE ROW LEVEL SECURITY;
COMMIT;
