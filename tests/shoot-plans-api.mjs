// Integration checks against an isolated local Next server; never target a live restaurant database.
// Start it with ADMIN_JWT_SECRET=local-shoot-planner-test-only and a throwaway PostgreSQL database.
// Then: node tests/shoot-plans-api.mjs
import assert from "node:assert/strict";
import { SignJWT } from "jose";
import pg from "pg";
const base = "http://127.0.0.1:3018";
const token = await new SignJWT({
  sub: "shoot-test",
  email: "test@example.invalid",
  name: "Test",
  role: "owner",
})
  .setProtectedHeader({ alg: "HS256" })
  .setExpirationTime("1h")
  .sign(new TextEncoder().encode("local-shoot-planner-test-only"));
const headers = {
  Cookie: `admin_token=${token}`,
  "Content-Type": "application/json",
};
const shoot = () => ({
  id: crypto.randomUUID(),
  title: "Brunch content test",
  date: "2026-09-26",
  time: "11:00",
  location: "streatham",
  objective: "Food and atmosphere",
  notes: "",
  status: "planned",
  shots: [],
});
const shot = (title) => ({
  id: crypto.randomUUID(),
  title,
  description: "",
  format: "photo",
  preparation: "",
  assignee: "",
  referenceUrl: "",
  captured: false,
});
const request = async (path, method = "GET", body, authenticated = true) => {
  const res = await fetch(base + "/api/admin/shoot-plans" + path, {
    method,
    headers: authenticated ? headers : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
};
assert.equal((await request("", "GET", undefined, false)).status, 401);
assert.equal((await request("", "POST", shoot(), false)).status, 401);
assert.equal((await request("/missing", "GET", undefined, false)).status, 401);
assert.equal((await request("/missing", "PATCH", shoot(), false)).status, 401);
assert.equal((await request("/missing")).status, 404);
for (const invalid of [
  { title: "" },
  { date: "2026-02-30" },
  { time: "25:00" },
  { date: "", time: "11:00" },
  { status: "published" },
  { location: "__proto__" },
  { shots: [{ ...shot("Bad link"), referenceUrl: "javascript:alert(1)" }] },
  { shots: [{ ...shot("Bad format"), format: "invalid" }] },
]) {
  assert.equal(
    (await request("", "POST", { ...shoot(), ...invalid })).status,
    400,
    JSON.stringify(invalid),
  );
}
const input = {
  ...shoot(),
  shots: [shot("Jollof close-up"), shot("Brunch toast")],
};
const created = await request("", "POST", input);
assert.equal(created.status, 201, JSON.stringify(created.body));
assert.equal(created.body.plan.shots.length, 2);
const repeat = await request("", "POST", input);
assert.equal(repeat.body.plan.id, created.body.plan.id);
assert.equal(repeat.body.plan.version, 1);
const changed = await request("/" + input.id, "PATCH", {
  ...created.body.plan,
  title: "Updated shoot",
  shots: [...created.body.plan.shots]
    .reverse()
    .map((s, i) => ({ ...s, captured: i === 0 })),
});
assert.equal(changed.status, 200, JSON.stringify(changed.body));
assert.equal(changed.body.plan.version, 2);
assert.equal(changed.body.plan.shots[0].title, "Brunch toast");
assert.equal(changed.body.plan.shots[0].captured, true);
assert.equal(
  (await request("/" + input.id, "PATCH", created.body.plan)).status,
  409,
);
assert.equal((await request("/" + input.id)).body.plan.title, "Updated shoot");
const removed = await request("/" + input.id, "PATCH", {
  ...changed.body.plan,
  shots: [],
  status: "completed",
});
assert.equal(removed.body.plan.shots.length, 0);
assert.equal(
  (await request("?status=completed")).body.plans.some(
    (p) => p.id === input.id,
  ),
  true,
);
assert.equal(
  (await request("?status=planned")).body.plans.some((p) => p.id === input.id),
  false,
);
const another = await request("", "POST", {
  ...shoot(),
  shots: [shot("Another plan shot")],
});
const rollback = await request("/" + input.id, "PATCH", {
  ...removed.body.plan,
  title: "Must roll back",
  shots: another.body.plan.shots,
});
assert.equal(rollback.status, 503);
assert.equal((await request("/" + input.id)).body.plan.title, "Updated shoot");
assert.equal(
  (await request("/" + input.id)).body.plan.version,
  removed.body.plan.version,
);
for (let i = 0; i < 13; i++)
  assert.equal((await request("", "POST", shoot())).status, 201);
const list = await request("");
assert.equal(list.body.plans.length, 12);
assert.ok(list.body.pages >= 2);
const last = await request("?page=999999999");
assert.equal(last.body.page, last.body.pages);
assert.ok(last.body.plans.length > 0);
console.log(
  "PASS: auth, validation, create/retry, read, reorder, capture, stale-save conflict, remove, status filter, transaction rollback and pagination.",
);

// Destructive checks run only against the explicitly isolated database above.
const deletion = await request("", "POST", {
  ...shoot(),
  shots: [shot("Delete fixture")],
});
const deleteId = deletion.body.plan.id;
const db = new pg.Client({
  connectionString: "postgresql://postgres:postgres@127.0.0.1:55439/postgres",
});
await db.connect();
try {
  for (const table of ["ShootPlanShare", "ShootPlanEditorShare"]) {
    await db.query(
      `INSERT INTO "${table}" ("planId", "token", "pinHash") VALUES ($1, $2, $3)`,
      [deleteId, crypto.randomUUID(), "fixture"],
    );
  }
  await db.query(
    'INSERT INTO "ShootReference" ("id", "planId", "data") VALUES ($1, $2, $3)',
    [crypto.randomUUID(), deleteId, Buffer.from("fixture")],
  );
  assert.equal(
    (await request("/" + deleteId, "DELETE", { version: 1 }, false)).status,
    401,
  );
  assert.equal((await request("/" + deleteId, "DELETE", {})).status, 400);
  const foreign = await fetch(base + "/api/admin/shoot-plans/" + deleteId, {
    method: "DELETE",
    headers: { ...headers, Origin: "https://example.invalid" },
    body: JSON.stringify({ version: 1 }),
  });
  assert.equal(foreign.status, 403);
  assert.equal(
    (await request("/" + deleteId, "DELETE", { version: 2 })).status,
    409,
  );
  assert.equal((await request("/" + deleteId)).status, 200);
  assert.equal(
    (await request("/" + deleteId, "DELETE", { version: 1 })).status,
    200,
  );
  assert.equal((await request("/" + deleteId)).status, 404);
  assert.equal(
    (await request("/" + deleteId, "DELETE", { version: 1 })).status,
    200,
  );
  for (const table of [
    "ShootShot",
    "ShootPlanShare",
    "ShootPlanEditorShare",
    "ShootReference",
  ]) {
    const result = await db.query(
      `SELECT count(*) FROM "${table}" WHERE "planId" = $1`,
      [deleteId],
    );
    assert.equal(Number(result.rows[0].count), 0, table);
  }
  assert.equal((await request("/" + another.body.plan.id)).status, 200);
  console.log(
    "PASS: delete authentication, origin, version conflicts, retries and cascading cleanup; other plans preserved.",
  );
} finally {
  await db.end();
}
