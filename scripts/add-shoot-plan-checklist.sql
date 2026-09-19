-- Schema only: existing plans receive an empty checklist. No content is seeded.
ALTER TABLE "ShootPlan" ADD COLUMN IF NOT EXISTS "checklist" JSONB NOT NULL DEFAULT '[]'::jsonb;
