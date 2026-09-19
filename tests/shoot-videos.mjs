// Isolated test server only. Fixtures never touch the restaurant database.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { SignJWT } from "jose";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = "http://127.0.0.1:3018";
const jwt = await new SignJWT({ sub: "video-tests", role: "owner" })
  .setProtectedHeader({ alg: "HS256" })
  .setExpirationTime("1h")
  .sign(new TextEncoder().encode("local-shoot-planner-test-only"));
const admin = `admin_token=${jwt}`;
async function req(path, method = "GET", body, cookie = admin) {
  const r = await fetch(base + path, {
    method,
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return {
    status: r.status,
    headers: r.headers,
    body: await r.json().catch(() => null),
  };
}
function video(title) {
  return {
    id: crypto.randomUUID(),
    title,
    style: "Menu-led compilation · No talking · Trending audio",
    concept:
      "A fast compilation of brunch food and drink, with text overlays introducing the menu.",
    openingText: "SATURDAY BOTTOMLESS BRUNCH",
    midVideoText: "TEAM MEATY / TEAM SEAFOOD",
    offerText: "£35 food only / £50 with bottomless drinks",
    endFrame: "Every Saturday · Streatham Hill · Book your table",
    references: [],
  };
}
const videos = [
  video("Saturday Bottomless Brunch"),
  {
    ...video("Saturday Brunch Experience"),
    style: "Atmosphere · General B-roll",
    openingText: "Your Saturday starts here",
    midVideoText: "",
    offerText: "",
    endFrame: "Book your table",
  },
];
const draft = {
  id: crypto.randomUUID(),
  title: "Saturday at Demi’s",
  date: "2026-10-03",
  time: "11:00",
  location: "streatham",
  status: "planned",
  objective:
    "Capture a focused bank of vertical content for Saturday brunch ads and social content.",
  visualDirection:
    "Warm, appetising, social and polished. Food and drink remain the main focus.",
  outputFormat: "Vertical 9:16",
  notes:
    "Working shoot guide. Final wording and pacing may change during editing.",
  checklist: [],
  videos,
  shots: [],
};
const shot = (title, videoId) => ({
  id: crypto.randomUUID(),
  videoId,
  title,
  format: "vertical_video",
  description: "",
  preparation: "",
  assignee: "Content team",
  referenceUrl: "",
  captured: false,
});
draft.shots = [
  shot("Hero drinks line-up", videos[0].id),
  shot("Meaty dish close-up", videos[0].id),
  shot("A table full of friends", videos[1].id),
  shot("Exterior signage", ""),
];
let created = await req("/api/admin/shoot-plans", "POST", draft);
assert.equal(created.status, 201, JSON.stringify(created.body));
let plan = created.body.plan;
const path = "/api/admin/shoot-plans/" + plan.id;
const legacy = { ...plan };
delete legacy.videos;
delete legacy.visualDirection;
delete legacy.outputFormat;
legacy.shots = legacy.shots.map(({ videoId, ...shot }) => shot);
let update = await req(path, "PATCH", legacy);
assert.equal(update.status, 200);
plan = update.body.plan;
assert.equal(plan.videos.length, 2);
assert.equal(plan.shots[0].videoId, videos[0].id);
assert.equal(plan.visualDirection, draft.visualDirection);
for (const patch of [
  { videos: [{ ...videos[0], title: "" }] },
  { videos: [videos[0], videos[0]] },
  { shots: [{ ...draft.shots[0], videoId: crypto.randomUUID() }] },
  {
    videos: [
      { ...videos[0], references: [{ id: crypto.randomUUID(), caption: "" }] },
    ],
  },
])
  assert.equal((await req(path, "PATCH", { ...plan, ...patch })).status, 400);
const imageFile = await readFile("public/brunch/meaty.jpg");
async function upload(
  endpoint,
  cookie,
  id = crypto.randomUUID(),
  bytes = imageFile,
  type = "image/jpeg",
) {
  const form = new FormData();
  form.set("id", id);
  form.set("file", new Blob([bytes], { type }), "reference.jpg");
  const r = await fetch(base + endpoint, {
    method: "POST",
    headers: { Cookie: cookie },
    body: form,
  });
  return { status: r.status, body: await r.json() };
}
const images = path + "/references";
assert.equal((await upload(images, "")).status, 401);
assert.equal(
  (
    await upload(
      images,
      admin,
      crypto.randomUUID(),
      Buffer.from("<svg/>"),
      "image/svg+xml",
    )
  ).status,
  400,
);
const image = await upload(images, admin);
assert.equal(image.status, 201, JSON.stringify(image.body));
const imageId = image.body.reference.id;
assert.equal((await upload(images, admin, imageId)).status, 201);
plan.videos[0].references = [
  { id: imageId, caption: "Food close-up · Demi’s brunch" },
];
update = await req(path, "PATCH", plan);
assert.equal(update.status, 200);
plan = update.body.plan;
const another = await req("/api/admin/shoot-plans", "POST", {
  ...draft,
  id: crypto.randomUUID(),
  shots: [],
});
assert.equal(
  (
    await req("/api/admin/shoot-plans/" + another.body.plan.id, "PATCH", {
      ...another.body.plan,
      videos: plan.videos,
    })
  ).status,
  400,
);
assert.equal(
  (
    await fetch(
      base +
        "/api/admin/shoot-plans/" +
        another.body.plan.id +
        "/references?image=" +
        imageId,
      { headers: { Cookie: admin } },
    )
  ).status,
  404,
);
const share = await req(path + "/share", "PUT", {
  enabled: true,
  version: 0,
  pin: "123456",
});
const publicPath = "/api/shoot-plans/" + share.body.share.token;
const edit = await req(path + "/collaborators", "PUT", {
  enabled: true,
  version: 0,
  pin: "654321",
});
const editPath = "/api/shoot-plans/collaborate/" + edit.body.share.token;
assert.equal(
  (await fetch(base + publicPath + "/references?image=" + imageId)).status,
  401,
);
const unlocked = await req(publicPath, "POST", { pin: "123456" }, "");
const viewerCookie = unlocked.headers.get("set-cookie").split(";")[0];
const img = await fetch(base + publicPath + "/references?image=" + imageId, {
  headers: { Cookie: viewerCookie },
});
assert.equal(img.status, 200);
assert.equal(img.headers.get("content-type"), "image/webp");
assert.match(img.headers.get("cache-control"), /no-store/);
assert.equal(
  (await upload(editPath + "/references", viewerCookie)).status,
  401,
);
const editUnlock = await req(editPath, "POST", { pin: "654321" }, "");
const editorCookie = editUnlock.headers.get("set-cookie").split(";")[0];
assert.equal(
  (await upload(editPath + "/references", editorCookie)).status,
  201,
);
console.log(
  "PASS: structured videos, legacy compatibility, image ownership, idempotent upload, private image reads and collaborator upload permissions.",
);
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await ctx.addCookies([
    { name: "admin_token", value: jwt, url: base, httpOnly: true },
  ]);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/admin/shoot-plans/" + plan.id);
  await page.getByText("Shoot details", { exact: true }).click();
  await page.getByLabel("Visual direction", { exact: true }).waitFor();
  await page.screenshot({
    path: "/tmp/demis-overview-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Content plan (2)", exact: true }).click();
  await page.getByLabel("Video title", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Add video brief", exact: true }).click();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.waitForFunction(
    () => document.activeElement?.id === "video-2-title",
  );
  await page.getByLabel("Video title", { exact: true }).fill("Sunday buffet");
  await page
    .getByRole("button", { name: "Move video brief up", exact: true })
    .click();
  await page.getByRole("button", { name: "Remove video brief", exact: true }).click();
  await page
    .getByRole("button", { name: "Undo remove video brief", exact: true })
    .click();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByText("Shoot plan saved.", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: /01 Saturday Bottomless Brunch/ })
    .click();
  await page.locator("summary").filter({ hasText: "On-screen text" }).click();
  await page
    .getByLabel("Opening text", { exact: true })
    .fill("SATURDAY BRUNCH AT DEMI’S");
  await page
    .getByLabel("Reference image file", { exact: true })
    .setInputFiles("public/brunch/hero.jpg");
  await page.getByLabel("Caption 2", { exact: true }).waitFor();
  await page.getByLabel("Caption 2", { exact: true }).fill("The brunch table");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByText("Shoot plan saved.", { exact: true }).waitFor();
  await page.screenshot({
    path: "/tmp/demis-video-editor-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  assert.equal(
    await page
      .locator(".shoot-document")
      .getByText("SATURDAY BRUNCH AT DEMI’S", { exact: true })
      .count(),
    1,
  );
  await page.locator(".shoot-document img").first().waitFor();
  await page.screenshot({
    path: "/tmp/demis-document-desktop.png",
    fullPage: true,
  });
  const visitor = await browser.newPage({
    viewport: { width: 390, height: 844 },
  });
  visitor.on("pageerror", (e) => errors.push(e.message));
  await visitor.goto(base + publicPath.replace("/api/", "/"));
  await visitor.getByLabel("Six-digit PIN", { exact: true }).fill("123456");
  await visitor
    .getByRole("button", { name: "View shoot plan", exact: true })
    .click();
  await visitor.locator(".shoot-document").waitFor();
  assert.equal(await visitor.getByRole("textbox").count(), 0);
  assert.equal(await visitor.getByRole("checkbox").count(), 0);
  assert.equal(await visitor.locator(".shoot-document img").count(), 2);
  for (const img of await visitor.locator(".shoot-document img").all())
    await img.scrollIntoViewIfNeeded();
  await visitor.waitForFunction(() =>
    Array.from(document.querySelectorAll(".shoot-document img")).every(
      (img) => img.complete && img.naturalWidth > 0,
    ),
  );
  assert.ok(
    await visitor.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await visitor.screenshot({
    path: "/tmp/demis-document-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Content plan (3)", exact: true }).click();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.getByRole("button", { name: "Shoot day", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Mark captured: Hero drinks line-up",
      exact: true,
    })
    .click();
  await page.getByText("Shot updated.", { exact: true }).waitFor();
  await req(path + "/share", "PUT", {
    enabled: false,
    version: share.body.share.version,
  });
  assert.equal(
    (
      await fetch(base + publicPath + "/references?image=" + imageId, {
        headers: { Cookie: viewerCookie },
      })
    ).status,
    404,
  );
  await req(path + "/collaborators", "PUT", {
    enabled: false,
    version: edit.body.share.version,
  });
  assert.equal(
    (await upload(editPath + "/references", editorCookie)).status,
    404,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: overview, video validation/focus, reorder/remove/undo, uploads, professional preview, mobile public template, private image revocation and shoot-day capture.",
  );
} finally {
  await browser.close();
}
