// Run against the isolated test server described in tests/shoot-plans-api.mjs.
// Set PLAYWRIGHT_MODULE to an installed playwright path when it is not local.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { SignJWT } from "jose";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const browser = await chromium.launch({
  headless: true,
  channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
});
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const token = await new SignJWT({
    sub: "shoot-test",
    email: "test@example.invalid",
    name: "Test",
    role: "owner",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode("local-shoot-planner-test-only"));
  await context.addCookies([
    {
      name: "admin_token",
      value: token,
      url: "http://127.0.0.1:3018",
      httpOnly: true,
    },
  ]);
  const page = await context.newPage();
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await page.goto("http://127.0.0.1:3018/admin/shoot-plans");
  await page
    .getByRole("heading", { name: "Weekly plans", exact: true })
    .waitFor();
  await page.getByRole("link", { name: "New weekly plan", exact: true }).click();
  await page
    .getByRole("button", { name: "Create plan", exact: true })
    .first()
    .click();
  await page.getByText("Add a title.", { exact: true }).last().waitFor();
  await page.waitForFunction(() => document.activeElement?.id === "title");
  assert.equal(
    await page.locator("#title").evaluate((e) => e === document.activeElement),
    true,
  );
  await page
    .getByLabel("Plan title", { exact: true })
    .fill("Saturday brunch — food & atmosphere");
  await page
    .getByLabel("Objective")
    .fill(
      "A warm, lively brunch reel: fresh plates, bottomless drinks and the people behind Demi’s.",
    );
  await page.getByText("Shoot details", { exact: true }).click();
  await page.getByLabel("Date", { exact: true }).fill("2026-09-26");
  await page.getByLabel("Time · London").fill("11:00");
  await page
    .getByLabel("Restaurant", { exact: true })
    .selectOption("streatham");
  await page
    .getByLabel("Week notes")
    .fill(
      "Film food first while plates are fresh. Bring tripod and microphone. Capture room atmosphere before service.",
    );
  await page.getByRole("button", { name: "Content plan", exact: true }).click();
  await page
    .getByRole("button", { name: "Add your first video brief", exact: true })
    .click();
  await page.getByLabel("Video title", { exact: true }).fill("Brunch reel");
  await page.getByRole("button", { name: "Add your first shot" }).click();
  await page
    .getByLabel("Shot 1", { exact: true })
    .fill("Jollof rice — first spoonful");
  await page
    .locator("summary")
    .filter({ hasText: "Shot details" })
    .first()
    .click();
  await page
    .getByLabel("Action & camera direction")
    .fill(
      "Slow push-in as steam rises. Finish on the spoon lifting from the plate.",
    );
  await page
    .getByLabel("Preparation")
    .fill("Fresh jollof, clean plate, window-side table.");
  await page.getByLabel("Assigned to").fill("Content team");
  await page.getByLabel("Reference link").fill("https://example.com/reference");
  await page.getByRole("button", { name: "Add shot" }).click();
  await page
    .getByLabel("Shot 2", { exact: true })
    .fill("Brunch table — the first toast");
  await page
    .locator("summary")
    .filter({ hasText: "Shot details" })
    .nth(1)
    .click();
  await page
    .getByLabel("Format", { exact: true })
    .nth(1)
    .selectOption("photo_video");
  await page
    .getByLabel("Action & camera direction")
    .nth(1)
    .fill("Wide table shot, then glasses meeting in the centre.");
  await page
    .getByRole("button", { name: "Move shot 2 up", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("Shot 1", { exact: true }).inputValue(),
    "Brunch table — the first toast",
  );
  await page
    .getByRole("button", { name: "Remove shot 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Undo remove shot" }).click();
  await page.getByRole("link", { name: "Weekly plans", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Keep editing" })
      .evaluate((e) => e === document.activeElement),
    true,
  );
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Create plan", exact: true })
    .first()
    .click();
  await page.waitForURL(/shoot-plans\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "Shoot day", exact: true }).waitFor();
  const planUrl = page.url();
  await page.screenshot({
    path: "/tmp/demis-shoot-plan-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Shoot day", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Mark captured: Brunch table — the first toast",
      exact: true,
    })
    .click();
  await page.getByText("Shot updated.", { exact: true }).waitFor();
  await page.reload();
  await page.getByRole("button", { name: "Shoot day", exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", {
        name: "Mark not captured: Brunch table — the first toast",
        exact: true,
      })
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "/tmp/demis-shoot-day-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Mobile horizontal overflow",
  );
  await page
    .getByRole("button", { name: "Week overview", exact: true })
    .click();
  await page
    .getByLabel("Plan title", { exact: true })
    .fill("Updated mobile shoot");
  await page.route("**/api/admin/shoot-plans/*", (route) =>
    route.request().method() === "PATCH"
      ? route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Test server unavailable. Try again.",
          }),
        })
      : route.continue(),
  );
  await page
    .getByRole("button", { name: "Save changes", exact: true })
    .first()
    .click();
  await page
    .getByText("Test server unavailable. Try again.", { exact: true })
    .waitFor();
  assert.equal(
    await page.getByLabel("Plan title", { exact: true }).inputValue(),
    "Updated mobile shoot",
  );
  await page.unroute("**/api/admin/shoot-plans/*");
  // Change the plan through a second client; the editor must retain edits and show a conflict.
  const serverPlan = (
    await (
      await context.request.get(planUrl.replace("/admin/", "/api/admin/"))
    ).json()
  ).plan;
  assert.equal(
    (
      await context.request.patch(planUrl.replace("/admin/", "/api/admin/"), {
        data: { ...serverPlan, notes: "Updated by another member of staff" },
      })
    ).status(),
    200,
  );
  await page
    .getByRole("button", { name: "Save changes", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Copy my edits" }).waitFor();
  assert.equal(
    await page.getByLabel("Plan title", { exact: true }).inputValue(),
    "Updated mobile shoot",
  );
  await page.getByRole("link", { name: "Weekly plans", exact: true }).click();
  await page
    .getByRole("button", { name: "Leave without saving", exact: true })
    .click();
  await page.waitForURL("**/admin/shoot-plans");
  await page.getByLabel("Show shoots").selectOption("cancelled");
  await page
    .getByRole("heading", { name: "No shoots with this status" })
    .waitFor();
  await page.route("**/api/admin/shoot-plans?**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Unable to load test plans." }),
    }),
  );
  await page.getByRole("button", { name: "Show all shoots" }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Unable to load test plans." })
    .waitFor();
  await page.unroute("**/api/admin/shoot-plans?**");
  await page.getByRole("button", { name: "Try again" }).click();
  await page
    .getByRole("link", { name: /Saturday brunch — food & atmosphere/ })
    .first()
    .waitFor();
  assert.deepEqual(failures, []);
  console.log(
    "PASS: browser create, validation/focus, edit, reorder, remove/undo, unsaved dialog/Escape, capture persistence, mobile layout, server failure/retry, multi-user conflict, empty filter and list recovery.",
  );
} finally {
  await browser.close();
}
