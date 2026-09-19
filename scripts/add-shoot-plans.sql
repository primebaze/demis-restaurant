-- Additive setup for installations using prisma db push (this repo has no migration baseline).
-- Run once against the target database before deploying the shoot planner.
BEGIN;
CREATE TABLE IF NOT EXISTS "ShootPlan" (
  "id" TEXT PRIMARY KEY, "title" TEXT NOT NULL, "date" TEXT NOT NULL DEFAULT '',
  "time" TEXT NOT NULL DEFAULT '', "location" TEXT NOT NULL DEFAULT 'cricklewood',
  "objective" TEXT NOT NULL DEFAULT '', "notes" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'planned', "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE IF NOT EXISTS "ShootShot" (
  "id" TEXT PRIMARY KEY, "planId" TEXT NOT NULL REFERENCES "ShootPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "title" TEXT NOT NULL, "description" TEXT NOT NULL DEFAULT '', "format" TEXT NOT NULL DEFAULT 'vertical_video',
  "preparation" TEXT NOT NULL DEFAULT '', "assignee" TEXT NOT NULL DEFAULT '', "referenceUrl" TEXT NOT NULL DEFAULT '',
  "captured" BOOLEAN NOT NULL DEFAULT false, "sortOrder" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "ShootPlan_date_createdAt_idx" ON "ShootPlan"("date", "createdAt");
CREATE INDEX IF NOT EXISTS "ShootPlan_status_idx" ON "ShootPlan"("status");
CREATE INDEX IF NOT EXISTS "ShootShot_planId_sortOrder_idx" ON "ShootShot"("planId", "sortOrder");
COMMIT;
