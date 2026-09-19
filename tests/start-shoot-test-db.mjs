// Optional development harness. Requires @electric-sql/pglite and pglite-socket.
// Entirely in memory; creates no restaurant data and loads no .env credentials.
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const schema = execFileSync(
  process.execPath,
  [
    "node_modules/prisma/build/index.js",
    "migrate",
    "diff",
    "--from-empty",
    "--to-schema",
    "prisma/schema.prisma",
    "--script",
  ],
  { encoding: "utf8" },
);
const db = await PGlite.create();
await db.exec(schema);
// Exercise the exact additive deployment SQL, including a safe second run.
await db.exec(
  'DROP TABLE "ShootReference"; DROP TABLE "ShootPlanEditorShare"; DROP TABLE "ShootPlanShare"; DROP TABLE "ShootShot"; DROP TABLE "ShootPlan";',
);
const setup = readFileSync("scripts/add-shoot-plans.sql", "utf8");
await db.exec(setup);
await db.exec(setup);
const sharingSetup = readFileSync("scripts/add-shoot-plan-sharing.sql", "utf8");
await db.exec(sharingSetup);
await db.exec(sharingSetup);
const checklistSetup = readFileSync("scripts/add-shoot-plan-checklist.sql", "utf8");
await db.exec(checklistSetup);
await db.exec(checklistSetup);
const collaborationSetup = readFileSync("scripts/add-shoot-plan-collaboration.sql", "utf8");
await db.exec(collaborationSetup);
await db.exec(collaborationSetup);
const videoSetup = readFileSync("scripts/add-shoot-plan-videos.sql", "utf8");
await db.exec(videoSetup);
await db.exec(videoSetup);
const weeklySetup = readFileSync("scripts/add-weekly-planning.sql", "utf8");
await db.exec(weeklySetup);
await db.exec(weeklySetup);
const server = new PGLiteSocketServer({
  db,
  host: "127.0.0.1",
  port: 55439,
  maxConnections: 10,
});
await server.start();
console.log(
  "Isolated shoot-plan database listening on 127.0.0.1:55439. Stop this process to discard it.",
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    await server.stop();
    await db.close();
    process.exit(0);
  });
