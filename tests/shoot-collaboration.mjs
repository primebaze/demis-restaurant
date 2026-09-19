// Only the isolated local app/database; never use these fixtures on production.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { SignJWT } from "jose";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = "http://127.0.0.1:3018";
const jwt = await new SignJWT({
  sub: "collaboration-test",
  role: "owner",
  email: "test@example.invalid",
  name: "Test",
})
  .setProtectedHeader({ alg: "HS256" })
  .setExpirationTime("1h")
  .sign(new TextEncoder().encode("local-shoot-planner-test-only"));
const adminCookie = `admin_token=${jwt}`;
async function request(path, method = "GET", body, cookie = "", origin) {
  const r = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      ...(origin ? { Origin: origin } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return {
    status: r.status,
    headers: r.headers,
    body: await r.json().catch(() => null),
  };
}
async function makePlan(title) {
  const r = await request(
    "/api/admin/shoot-plans",
    "POST",
    {
      id: crypto.randomUUID(),
      title,
      date: "2026-10-03",
      time: "11:00",
      location: "streatham",
      objective: "Food and atmosphere",
      notes: "Bring a microphone",
      status: "planned",
      checklist: [],
      shots: [],
    },
    adminCookie,
  );
  assert.equal(r.status, 201);
  return r.body.plan;
}
const plan = await makePlan("Collaborator test shoot");
const other = await makePlan("A different private shoot");
const settings = `/api/admin/shoot-plans/${plan.id}/collaborators`;
assert.equal((await request(settings)).status, 401);
assert.equal(
  (await request(settings, "GET", undefined, adminCookie)).body.share,
  null,
);
assert.equal(
  (await request(settings, "PUT", { version: 0, enabled: true, pin: "123456" }))
    .status,
  401,
);
const enabled = await request(
  settings,
  "PUT",
  { version: 0, enabled: true, pin: "123456" },
  adminCookie,
);
assert.equal(enabled.status, 200);
let share = enabled.body.share;
const endpoint = `/api/shoot-plans/collaborate/${share.token}`;
const viewer = await request(
  `/api/admin/shoot-plans/${plan.id}/share`,
  "PUT",
  { version: 0, enabled: true, pin: "654321" },
  adminCookie,
);
const viewerEndpoint = `/api/shoot-plans/${viewer.body.share.token}`;
const viewerSession = await request(viewerEndpoint, "POST", { pin: "654321" });
const viewerCookie = viewerSession.headers.get("set-cookie").split(";")[0];
assert.equal((await request(endpoint)).status, 401);
assert.equal((await request(endpoint, "PATCH", plan)).status, 401);
assert.equal((await request(endpoint, "POST", { pin: "654321" })).status, 401);
assert.equal(
  (await request(endpoint, "PATCH", plan, viewerCookie)).status,
  401,
);
assert.equal(
  (
    await request(
      endpoint,
      "PATCH",
      plan,
      `shoot_edit_${share.token}=${viewerCookie.split("=")[1]}`,
    )
  ).status,
  401,
);
assert.equal(
  (await request(viewerEndpoint, "PATCH", plan, viewerCookie)).status,
  405,
);
const unlock = await request(endpoint, "POST", { pin: "123456" });
assert.equal(unlock.status, 200);
const cookie = unlock.headers.get("set-cookie").split(";")[0];
assert.match(unlock.headers.get("set-cookie"), /HttpOnly/i);
assert.match(unlock.headers.get("set-cookie"), /Secure/i);
assert.match(unlock.headers.get("set-cookie"), /SameSite=strict/i);
const read = await request(endpoint, "GET", undefined, cookie);
assert.equal(read.status, 200);
assert.equal(read.body.plan.id, plan.id);
assert.equal(JSON.stringify(read.body).includes("pinHash"), false);
assert.equal(
  (await request(`/api/admin/shoot-plans/${plan.id}`, "PATCH", plan, cookie))
    .status,
  401,
);
assert.equal(
  (await request(settings, "PUT", { version: 1, enabled: false }, cookie))
    .status,
  401,
);
assert.equal(
  (await request(endpoint, "PATCH", plan, cookie, "https://unrelated.invalid"))
    .status,
  403,
);
const edit = {
  ...read.body.plan,
  id: other.id,
  title: "Collaborator saved title",
  checklist: [
    { id: crypto.randomUUID(), text: "Food review", completed: true },
  ],
  shots: [
    {
      id: crypto.randomUUID(),
      title: "Buffet close-up",
      description: "",
      format: "photo",
      preparation: "",
      assignee: "Collaborator",
      referenceUrl: "",
      captured: false,
    },
  ],
};
const saved = await request(endpoint, "PATCH", edit, cookie, base);
assert.equal(saved.status, 200);
assert.equal(
  saved.body.plan.id,
  plan.id,
  "request body cannot change the target plan",
);
assert.equal(
  (
    await request(
      `/api/admin/shoot-plans/${other.id}`,
      "GET",
      undefined,
      adminCookie,
    )
  ).body.plan.title,
  other.title,
);
assert.equal(
  (await request(endpoint, "PATCH", edit, cookie)).status,
  409,
  "stale collaborator must not overwrite",
);
assert.equal(
  (await request(endpoint, "PATCH", { ...saved.body.plan, title: "" }, cookie))
    .status,
  400,
);
const publicView = await request(
  viewerEndpoint,
  "GET",
  undefined,
  viewerCookie,
);
assert.equal(publicView.body.plan.title, "Collaborator saved title");
assert.equal(publicView.body.plan.checklist[0].completed, true);
const disabled = await request(
  settings,
  "PUT",
  { version: share.version, enabled: false },
  adminCookie,
);
assert.equal(disabled.status, 200);
assert.equal(
  (await request(endpoint, "PATCH", saved.body.plan, cookie)).status,
  404,
);
assert.equal(
  (await request(viewerEndpoint, "GET", undefined, viewerCookie)).status,
  200,
  "revoking editors leaves viewer access intact",
);
const reenabled = await request(
  settings,
  "PUT",
  { version: disabled.body.share.version, enabled: true, pin: "234567" },
  adminCookie,
);
assert.equal(
  (await request(endpoint, "PATCH", saved.body.plan, cookie)).status,
  401,
);
const newUnlock = await request(endpoint, "POST", { pin: "234567" });
assert.equal(newUnlock.status, 200);
const newCookie = newUnlock.headers.get("set-cookie").split(";")[0];
const rotated = await request(
  settings,
  "PUT",
  { version: reenabled.body.share.version, enabled: true, pin: "345678" },
  adminCookie,
);
assert.equal(rotated.status, 200);
assert.equal(
  (await request(endpoint, "PATCH", saved.body.plan, newCookie)).status,
  401,
  "PIN rotation invalidates editors",
);
for (let i = 0; i < 10; i++)
  assert.equal(
    (await request(endpoint, "POST", { pin: "000000" })).status,
    401,
  );
assert.equal((await request(endpoint, "POST", { pin: "345678" })).status, 429);
assert.equal(
  (await request(viewerEndpoint, "GET", undefined, viewerCookie)).status,
  200,
);
console.log(
  "PASS: collaborator auth, separate viewer permissions, plan isolation, validation, concurrent-save protection, public updates, PIN rotation, revocation, persistent attempt limit and no admin access.",
);

const uiPlan = await makePlan("Restaurant team shoot");
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
  headless: true,
});
try {
  const errors = [];
  const admin = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await admin.addCookies([
    { name: "admin_token", value: jwt, url: base, httpOnly: true },
  ]);
  const page = await admin.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/admin/shoot-plans/" + uiPlan.id);
  await page.getByRole("button", { name: "Sharing", exact: true }).click();
  await page
    .getByLabel("Set a six-digit collaborator PIN", { exact: true })
    .fill("456789");
  await page
    .getByRole("button", { name: "Enable collaborator editing", exact: true })
    .click();
  const link = page.getByLabel("Collaborator link", { exact: true });
  await link.waitFor();
  const url = await link.inputValue();
  assert.ok(url.includes("/shoot-plans/collaborate/"));
  await page.screenshot({
    path: "/tmp/demis-collaborator-sharing.png",
    fullPage: true,
  });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const editor = await ctx.newPage();
  editor.on("pageerror", (e) => errors.push(e.message));
  await editor.goto(url);
  await editor.getByLabel("Six-digit PIN", { exact: true }).waitFor();
  assert.equal(
    await editor.getByText(uiPlan.title, { exact: true }).count(),
    0,
  );
  await editor.getByLabel("Six-digit PIN", { exact: true }).fill("456789");
  await editor
    .getByRole("button", { name: "Edit shoot plan", exact: true })
    .click();
  await editor.getByText("Collaborator access", { exact: true }).waitFor();
  assert.equal(await editor.locator('a[href^="/admin"]').count(), 0);
  assert.equal(
    await editor
      .getByRole("button", { name: "Enable sharing", exact: true })
      .count(),
    0,
  );
  await editor
    .getByRole("button", { name: "Add content item", exact: true })
    .click();
  await editor
    .getByLabel("Content item 1", { exact: true })
    .fill("Highlight reel");
  assert.equal(
    await editor
      .getByRole("button", { name: "Lock page", exact: true })
      .isDisabled(),
    true,
  );
  const patchPath = "**/api/shoot-plans/collaborate/*";
  await editor.route(patchPath, (route) =>
    route.request().method() === "PATCH"
      ? route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Temporary test failure" }),
        })
      : route.continue(),
  );
  await editor
    .getByRole("button", { name: "Save changes", exact: true })
    .first()
    .click();
  await editor.getByText("Temporary test failure", { exact: true }).waitFor();
  assert.equal(
    await editor.getByLabel("Content item 1", { exact: true }).inputValue(),
    "Highlight reel",
  );
  await editor.unroute(patchPath);
  await editor
    .getByRole("button", { name: "Save changes", exact: true })
    .first()
    .click();
  await editor.getByText("Shoot plan saved.", { exact: true }).waitFor();
  assert.equal(
    (
      await request(
        "/api/admin/shoot-plans/" + uiPlan.id,
        "GET",
        undefined,
        adminCookie,
      )
    ).body.plan.checklist[0].text,
    "Highlight reel",
  );
  await editor.reload();
  await editor.getByLabel("Content item 1", { exact: true }).waitFor();
  assert.ok(
    await editor.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await editor.screenshot({
    path: "/tmp/demis-collaborator-mobile.png",
    fullPage: true,
  });
  await editor.getByRole("button", { name: "Shoot day", exact: true }).click();
  await editor
    .getByRole("checkbox", {
      name: "Complete content item 1: Highlight reel",
      exact: true,
    })
    .click();
  await editor.getByText("Checklist updated.", { exact: true }).waitFor();
  await editor.getByRole("button", { name: "Lock page", exact: true }).click();
  await editor.getByLabel("Six-digit PIN", { exact: true }).waitFor();
  await editor.getByLabel("Six-digit PIN", { exact: true }).fill("456789");
  await editor
    .getByRole("button", { name: "Edit shoot plan", exact: true })
    .click();
  await editor.getByLabel("Content item 1", { exact: true }).waitFor();
  await editor
    .getByLabel("Content item 1", { exact: true })
    .fill("Edits kept after revocation");
  await page
    .getByRole("button", { name: "Turn off collaborator editing", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Enable collaborator editing", exact: true })
    .waitFor();
  await editor
    .getByRole("button", { name: "Save changes", exact: true })
    .first()
    .click();
  await editor.getByRole("alert").filter({ hasText: "unavailable" }).waitFor();
  assert.equal(
    await editor.getByLabel("Content item 1", { exact: true }).inputValue(),
    "Edits kept after revocation",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: admin creates collaborator link, PIN gate, mobile editor, no admin controls, failed-save recovery, saved checklist, lock/unlock, revocation and draft preservation.",
  );
} finally {
  await browser.close();
}
