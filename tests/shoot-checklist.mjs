// Uses only the isolated database/app described in README; no live restaurant data.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { SignJWT } from "jose";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = "http://127.0.0.1:3018";
const token = await new SignJWT({
  sub: "checklist-test",
  role: "owner",
  email: "test@example.invalid",
  name: "Test",
})
  .setProtectedHeader({ alg: "HS256" })
  .setExpirationTime("1h")
  .sign(new TextEncoder().encode("local-shoot-planner-test-only"));
const headers = {
  "Content-Type": "application/json",
  Cookie: `admin_token=${token}`,
};
async function request(path = "", method = "GET", body) {
  const res = await fetch(base + "/api/admin/shoot-plans" + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, ...(await res.json()) };
}
const item = (text) => ({ id: crypto.randomUUID(), text, completed: false });
const input = {
  id: crypto.randomUUID(),
  title: "September content shoot",
  date: "2026-09-05",
  time: "",
  location: "streatham",
  objective: "",
  notes: "",
  status: "planned",
  shots: [],
  checklist: [
    item("Highlight / viral reel (decor, event details, food, buffet service)"),
    item("Food review"),
  ],
};
let result = await request("", "POST", input);
assert.equal(result.status, 201);
assert.deepEqual(result.plan.checklist, input.checklist);
const legacy = { ...result.plan };
delete legacy.checklist;
result = await request("/" + input.id, "PATCH", legacy);
assert.equal(result.status, 200);
assert.deepEqual(
  result.plan.checklist,
  input.checklist,
  "older client must preserve checklist",
);
for (const checklist of [
  null,
  [item("")],
  [{ ...item("Food"), completed: "yes" }],
  [{ ...item("Food"), id: "invalid" }],
  [input.checklist[0], input.checklist[0]],
  Array.from({ length: 101 }, () => item("Food")),
  [item("x".repeat(501))],
]) {
  assert.equal(
    (await request("/" + input.id, "PATCH", { ...result.plan, checklist }))
      .status,
    400,
  );
}
assert.deepEqual(
  (await request("/" + input.id)).plan.checklist,
  input.checklist,
);
const sharing = await request("/" + input.id + "/share", "PUT", {
  version: 0,
  enabled: true,
  pin: "234567",
});
assert.equal(sharing.status, 200);
const publicUrl = base + "/shoot-plans/" + sharing.share.token;
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
  headless: true,
});
try {
  const admin = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await admin.addCookies([
    { name: "admin_token", value: token, url: base, httpOnly: true },
  ]);
  const page = await admin.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/admin/shoot-plans/" + input.id);
  await page.getByLabel("Content item 1", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Move content item 2 up", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("Content item 1", { exact: true }).inputValue(),
    "Food review",
  );
  await page
    .getByRole("button", { name: "Remove content item 1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Undo remove item", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("Content item 1", { exact: true }).inputValue(),
    "Food review",
  );
  await page
    .getByRole("button", { name: "Add content item", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save changes", exact: true })
    .first()
    .click();
  assert.equal(
    await page
      .getByLabel("Content item 3", { exact: true })
      .getAttribute("aria-invalid"),
    "true",
  );
  await page
    .getByLabel("Content item 3", { exact: true })
    .fill("Behind the scenes");
  await page
    .getByRole("button", { name: "Save changes", exact: true })
    .first()
    .click();
  await page.getByText("Shoot plan saved.", { exact: true }).waitFor();
  await page.reload();
  assert.equal(
    await page.getByLabel("Content item 3", { exact: true }).inputValue(),
    "Behind the scenes",
  );
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page
    .locator("#checklist")
    .screenshot({ path: "/tmp/demis-checklist-editor.png" });
  await page.getByRole("button", { name: "Shoot day", exact: true }).click();
  await page
    .getByRole("checkbox", {
      name: "Complete content item 1: Food review",
      exact: true,
    })
    .click();
  await page.getByText("Checklist updated.", { exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("checkbox", {
        name: "Complete content item 1: Food review",
        exact: true,
      })
      .isChecked(),
    true,
  );
  const saved = (await request("/" + input.id)).plan;
  assert.equal(saved.checklist[0].completed, true);
  assert.deepEqual(
    saved.checklist.map((i) => i.text),
    ["Food review", input.checklist[0].text, "Behind the scenes"],
  );
  const visitor = await browser.newPage({
    viewport: { width: 390, height: 844 },
  });
  visitor.on("pageerror", (e) => errors.push(e.message));
  await visitor.goto(publicUrl);
  await visitor.getByLabel("Six-digit PIN", { exact: true }).waitFor();
  assert.equal(
    await visitor.getByText("Food review", { exact: true }).count(),
    0,
  );
  await visitor.getByLabel("Six-digit PIN", { exact: true }).fill("234567");
  await visitor
    .getByRole("button", { name: "View shoot plan", exact: true })
    .click();
  await visitor.getByText("Food review", { exact: true }).waitFor();
  assert.equal(await visitor.getByRole("checkbox").count(), 0);
  assert.equal(await visitor.locator(".shoot-document textarea").count(), 0);
  assert.equal(
    await visitor
      .locator(".shoot-document")
      .getByRole("img", { name: "Complete", exact: true })
      .count(),
    1,
  );
  assert.ok(
    await visitor.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await visitor
    .locator(".shoot-document")
    .screenshot({ path: "/tmp/demis-checklist-public.png" });
  await visitor.setViewportSize({ width: 1440, height: 1000 });
  await visitor
    .locator(".shoot-document")
    .screenshot({ path: "/tmp/demis-checklist-public-desktop.png" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: checklist persistence, old-client preservation, invalid payloads, reorder, remove/undo, empty-field validation, mobile layout, shoot-day completion, PIN gate and read-only sharing.",
  );
} finally {
  await browser.close();
}
