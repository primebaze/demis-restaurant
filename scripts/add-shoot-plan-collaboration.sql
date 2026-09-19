-- Schema only. Collaborator access stays off until an admin enables it.
BEGIN;
CREATE TABLE IF NOT EXISTS "ShootPlanEditorShare" (
  "planId" TEXT PRIMARY KEY REFERENCES "ShootPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "token" TEXT NOT NULL,
  "pinHash" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "ShootPlanEditorShare_token_key" ON "ShootPlanEditorShare"("token");
ALTER TABLE "ShootPlanEditorShare" ENABLE ROW LEVEL SECURITY;
COMMIT;
