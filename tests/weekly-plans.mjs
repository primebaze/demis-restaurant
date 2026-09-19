// Only uses the isolated localhost:3018 server and in-memory database.
import assert from "node:assert/strict";
import { SignJWT } from "jose";
import pg from "pg";
import { hash } from "bcryptjs";
import { writeFile } from "node:fs/promises";
const base = "http://127.0.0.1:3018";
const jwt = await new SignJWT({ sub: "weekly-test", role: "owner" })
  .setProtectedHeader({ alg: "HS256" })
  .setExpirationTime("1h")
  .sign(new TextEncoder().encode("local-shoot-planner-test-only"));
const headers = {
  Cookie: `admin_token=${jwt}`,
  "Content-Type": "application/json",
};
async function request(path, method = "GET", body, customHeaders = headers) {
  const response = await fetch(base + path, {
    method,
    headers: customHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    body: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}
const root = "/api/admin/shoot-plans";
const activity = (title, type, day) => ({
  id: crypto.randomUUID(),
  title,
  type,
  day,
  assignee: "Demi’s team",
  status: "planned",
  notes: "",
});
const activities = [
  activity("Brunch content shoot", "content_shoot", "monday"),
  activity("Build the events page", "web_development", "wednesday"),
  activity(
    "Check bookings and update the menu",
    "website_maintenance",
    "friday",
  ),
];
const video = {
  id: crypto.randomUUID(),
  activityId: activities[0].id,
  title: "Brunch highlights",
  style: "Trending audio",
  concept: "Food, drinks and atmosphere.",
  openingText: "Saturday brunch",
  midVideoText: "",
  offerText: "",
  endFrame: "Book your table",
  references: [],
};
const draft = {
  id: crypto.randomUUID(),
  title: "Demi’s weekly plan",
  weekStart: "2026-09-21",
  activities,
  date: "",
  time: "",
  location: "streatham",
  objective: "Prepare next week’s content and website updates.",
  notes: "",
  status: "planned",
  shots: [],
  videos: [video],
};
let result = await request(root, "POST", draft);
assert.equal(result.status, 201, JSON.stringify(result.body));
let plan = result.body.plan;
assert.equal(plan.activities.length, 3);
for (const patch of [
  { weekStart: "2026-09-22" },
  { weekStart: "2026-02-30" },
  { weekStart: "" },
  { activities: [{ ...activities[0], type: "bad" }] },
  { activities: [{ ...activities[0], day: "holiday" }] },
  { activities: [{ ...activities[0], title: "" }] },
  { activities: [activities[0], activities[0]] },
  { videos: [{ ...video, activityId: activities[1].id }] },
]) {
  assert.equal(
    (await request(`${root}/${plan.id}`, "PATCH", { ...plan, ...patch }))
      .status,
    400,
    JSON.stringify(patch),
  );
}
const legacy = { ...plan, title: "Demi’s weekly plan" };
delete legacy.weekStart;
delete legacy.activities;
legacy.videos = legacy.videos.map(({ activityId, ...rest }) => rest);
result = await request(`${root}/${plan.id}`, "PATCH", legacy);
assert.equal(result.status, 200, JSON.stringify(result.body));
plan = result.body.plan;
assert.equal(plan.activities.length, 3);
assert.equal(plan.weekStart, "2026-09-21");
assert.equal(plan.videos[0].activityId, activities[0].id);
assert.equal(
  (await request(`${root}/${plan.id}`, "PATCH", legacy)).status,
  409,
);
assert.ok(
  (await request(`${root}?week=2026-09-21`)).body.plans.some(
    (p) => p.id === plan.id,
  ),
);
assert.ok(
  !(await request(`${root}?week=2026-09-28`)).body.plans.some(
    (p) => p.id === plan.id,
  ),
);
const db = new pg.Client({
  connectionString: "postgresql://postgres:postgres@127.0.0.1:55439/postgres",
});
await db.connect();
const viewerToken = "a".repeat(48),
  editorToken = "b".repeat(48),
  pin = "654321";
try {
  await db.query(
    'INSERT INTO "AdminUser" ("id","email","passwordHash","name","role") VALUES ($1,$2,$3,$4,$5) ON CONFLICT ("email") DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash"',
    [
      "weekly-ui-test",
      "weekly@example.invalid",
      await hash("WeeklyTestOnly!", 10),
      "Weekly test",
      "owner",
    ],
  );
  for (const [table, token] of [
    ["ShootPlanShare", viewerToken],
    ["ShootPlanEditorShare", editorToken],
  ]) {
    await db.query(
      `INSERT INTO "${table}" ("planId","token","pinHash") VALUES ($1,$2,$3)`,
      [plan.id, token, await hash(pin, 10)],
    );
  }
} finally {
  await db.end();
}
const viewPath = `/api/shoot-plans/${viewerToken}`,
  editPath = `/api/shoot-plans/collaborate/${editorToken}`;
assert.equal((await request(viewPath, "GET", undefined, {})).status, 401);
const viewer = await request(
  viewPath,
  "POST",
  { pin },
  { "Content-Type": "application/json" },
);
const editor = await request(
  editPath,
  "POST",
  { pin },
  { "Content-Type": "application/json" },
);
const viewHeaders = {
  Cookie: viewer.cookie,
  "Content-Type": "application/json",
};
const editHeaders = {
  Cookie: editor.cookie,
  "Content-Type": "application/json",
};
assert.equal(
  (await request(viewPath, "GET", undefined, viewHeaders)).body.plan.activities
    .length,
  3,
);
assert.equal((await request(editPath, "PATCH", plan, viewHeaders)).status, 401);
result = await request(
  editPath,
  "PATCH",
  {
    ...plan,
    activities: plan.activities.map((item, i) => ({
      ...item,
      status: i === 2 ? "completed" : item.status,
    })),
  },
  editHeaders,
);
assert.equal(result.status, 200, JSON.stringify(result.body));
assert.equal(
  (await request(viewPath, "GET", undefined, viewHeaders)).body.plan
    .activities[2].status,
  "completed",
);
await writeFile(
  "/tmp/demis-weekly-test.json",
  JSON.stringify({ id: plan.id, viewerToken, editorToken }),
);
console.log(
  "PASS: mixed weekly activities, validation, week filters, legacy preservation, conflicts, PIN privacy, collaborator updates and read-only access.",
);
