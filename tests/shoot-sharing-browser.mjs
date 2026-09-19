import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { SignJWT } from "jose";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = "http://127.0.0.1:3018";
const token = await new SignJWT({
  sub: "share-ui-test",
  role: "owner",
  email: "test@example.invalid",
  name: "Test",
})
  .setProtectedHeader({ alg: "HS256" })
  .setExpirationTime("1h")
  .sign(new TextEncoder().encode("local-shoot-planner-test-only"));
const created = await fetch(base + "/api/admin/shoot-plans", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Cookie: `admin_token=${token}`,
  },
  body: JSON.stringify({
    id: crypto.randomUUID(),
    title: "Demi’s brunch content shoot",
    date: "2026-10-03",
    time: "11:00",
    location: "streatham",
    objective:
      "Capture fresh plates, the first toast and a lively Saturday at Demi’s.",
    notes:
      "Food first while plates are fresh. Bring the tripod and microphone.",
    status: "planned",
    shots: [
      {
        id: crypto.randomUUID(),
        title: "Jollof rice — first spoonful",
        description: "Slow push-in as steam rises from the plate.",
        format: "vertical_video",
        preparation: "Fresh jollof and a clean window-side table.",
        assignee: "Content team",
        referenceUrl: "https://example.com/reference",
        captured: false,
      },
    ],
  }),
});
assert.equal(created.status, 201);
const plan = (await created.json()).plan;
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
  headless: true,
});
try {
  const admin = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await admin.addCookies([
    { name: "admin_token", value: token, url: base, httpOnly: true },
  ]);
  const page = await admin.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/admin/shoot-plans/${plan.id}`);
  await page.getByRole("button", { name: "Sharing", exact: true }).click();
  await page
    .getByRole("button", { name: "Enable sharing", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Enable sharing", exact: true })
    .click();
  await page.getByText("Enter exactly six digits.", { exact: true }).waitFor();
  await page.getByLabel("Set a six-digit PIN", { exact: true }).fill("234567");
  await page.getByRole("button", { name: "Show PIN", exact: true }).click();
  assert.equal(await page.locator("#share-pin").getAttribute("type"), "text");
  await page
    .getByRole("button", { name: "Enable sharing", exact: true })
    .click();
  await page.getByLabel("Public link", { exact: true }).waitFor();
  const url = await page
    .getByLabel("Public link", { exact: true })
    .inputValue();
  assert.equal(await page.locator("#share-pin").inputValue(), "");
  assert.equal(
    await page.locator("#share-pin").getAttribute("type"),
    "password",
  );
  await page.screenshot({
    path: "/tmp/demis-sharing-admin.png",
    animations: "disabled",
  });
  const visitorContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const visitor = await visitorContext.newPage();
  visitor.on("pageerror", (e) => errors.push(e.message));
  await visitor.goto(url);
  await visitor
    .getByRole("heading", { name: "You’re invited to the shoot." })
    .waitFor();
  assert.equal(await visitor.getByText(plan.title, { exact: true }).count(), 0);
  await visitor.screenshot({
    path: "/tmp/demis-sharing-pin.png",
    animations: "disabled",
  });
  await visitor.getByLabel("Six-digit PIN", { exact: true }).fill("111111");
  await visitor
    .getByRole("button", { name: "View shoot plan", exact: true })
    .click();
  await visitor
    .getByRole("alert")
    .filter({ hasText: "Incorrect PIN" })
    .waitFor();
  await visitor.getByLabel("Six-digit PIN", { exact: true }).fill("234567");
  await visitor
    .getByRole("button", { name: "View shoot plan", exact: true })
    .click();
  await visitor
    .getByRole("heading", { name: plan.title, exact: true })
    .waitFor();
  assert.equal(
    await visitor.getByRole("button", { name: /save|edit|capture/i }).count(),
    0,
  );
  assert.equal(await visitor.getByRole("checkbox").count(), 0);
  assert.ok(
    await visitor.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await visitor.screenshot({
    path: "/tmp/demis-sharing-public.png",
    fullPage: true,
    animations: "disabled",
  });
  await visitor.reload();
  await visitor
    .getByRole("heading", { name: plan.title, exact: true })
    .waitFor();
  await page.getByLabel("New six-digit PIN", { exact: true }).fill("765432");
  await page.getByRole("button", { name: "Change PIN", exact: true }).click();
  await page.waitForFunction(
    () => document.getElementById("share-pin").value === "",
  );
  await visitor
    .getByRole("button", { name: "Refresh plan", exact: true })
    .click();
  await visitor
    .getByRole("heading", { name: "You’re invited to the shoot." })
    .waitFor();
  await visitor.getByLabel("Six-digit PIN", { exact: true }).fill("765432");
  await visitor
    .getByRole("button", { name: "View shoot plan", exact: true })
    .click();
  await visitor
    .getByRole("heading", { name: plan.title, exact: true })
    .waitFor();
  await visitor.getByRole("button", { name: "Lock page", exact: true }).click();
  await visitor
    .getByRole("heading", { name: "You’re invited to the shoot." })
    .waitFor();
  await page
    .getByRole("button", { name: "Turn off sharing", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Enable sharing", exact: true })
    .waitFor();
  await visitor.reload();
  await visitor
    .getByRole("heading", { name: "Link unavailable", exact: true })
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: admin enables sharing, PIN show/hide and clearing, public mobile gate, wrong PIN, read-only content, cookie persistence, PIN rotation, lock and disable.",
  );
} finally {
  await browser.close();
}
