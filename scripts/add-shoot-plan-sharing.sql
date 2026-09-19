-- Schema only. Does not enable sharing or add PINs for any existing plan.
BEGIN;
CREATE TABLE IF NOT EXISTS "ShootPlanShare" (
  "planId" TEXT PRIMARY KEY REFERENCES "ShootPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "token" TEXT NOT NULL,
  "pinHash" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "ShootPlanShare_token_key" ON "ShootPlanShare"("token");
-- Access goes through authenticated server routes, not the Supabase public API.
-- The application's PostgreSQL server role bypasses RLS.
ALTER TABLE "ShootPlanShare" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShootPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShootShot" ENABLE ROW LEVEL SECURITY;
COMMIT;
