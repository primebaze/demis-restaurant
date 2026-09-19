-- Additive only: existing shoot plans and sharing links remain intact. No seed data.
ALTER TABLE "ShootPlan" ADD COLUMN IF NOT EXISTS "weekStart" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ShootPlan" ADD COLUMN IF NOT EXISTS "activities" JSONB NOT NULL DEFAULT '[]'::jsonb;
