// Only targets the isolated test server, with its test-only admin secret.
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { SignJWT } from "jose";
const base = "http://127.0.0.1:3018";
const secret = "local-shoot-planner-test-only";
const jwt = await new SignJWT({
  sub: "share-test",
  role: "owner",
  email: "test@example.invalid",
  name: "Test",
})
  .setProtectedHeader({ alg: "HS256" })
  .setExpirationTime("1h")
  .sign(new TextEncoder().encode(secret));
const adminCookie = `admin_token=${jwt}`;
async function request(path, method = "GET", body, cookie = "") {
  const response = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", Cookie: cookie },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return {
    status: response.status,
    headers: response.headers,
    body: await response.json().catch(() => null),
  };
}
async function makePlan(title) {
  const result = await request(
    "/api/admin/shoot-plans",
    "POST",
    {
      id: crypto.randomUUID(),
      title,
      date: "2026-10-03",
      time: "11:00",
      location: "streatham",
      objective: "Private test brief",
      notes: "Private test notes",
      status: "planned",
      shots: [
        {
          id: crypto.randomUUID(),
          title: "Jollof close-up",
          description: "Capture steam rising",
          format: "vertical_video",
          preparation: "Fresh plate",
          assignee: "Content team",
          referenceUrl: "https://example.com/reference",
          captured: false,
        },
      ],
    },
    adminCookie,
  );
  assert.equal(result.status, 201);
  return result.body.plan;
}
const plan = await makePlan("Protected restaurant shoot");
const settings = `/api/admin/shoot-plans/${plan.id}/share`;
assert.equal((await request(settings)).status, 401);
assert.equal(
  (await request(settings, "PUT", { enabled: true, version: 0, pin: "123456" }))
    .status,
  401,
);
assert.equal(
  (await request(settings, "GET", undefined, adminCookie)).body.share,
  null,
);
assert.equal(
  (
    await request(
      settings,
      "PUT",
      { enabled: true, version: 0, pin: "1234" },
      adminCookie,
    )
  ).status,
  400,
);
const shared = await request(
  settings,
  "PUT",
  { enabled: true, version: 0, pin: "123456" },
  adminCookie,
);
assert.equal(shared.status, 200, JSON.stringify(shared.body));
const { token } = shared.body.share;
assert.match(token, /^[a-f0-9]{48}$/);
assert.deepEqual(Object.keys(shared.body.share).sort(), [
  "enabled",
  "token",
  "version",
]);
const endpoint = `/api/shoot-plans/${token}`;
const locked = await request(endpoint);
assert.equal(locked.status, 401);
assert.ok(!JSON.stringify(locked.body).includes(plan.title));
assert.match(locked.headers.get("cache-control"), /no-store/);
const html = await (await fetch(`${base}/shoot-plans/${token}`)).text();
assert.ok(!html.includes(plan.title));
assert.ok(!html.includes("Private test notes"));
assert.match(html, /noindex/);
assert.equal((await request(endpoint, "POST", { pin: "000000" })).status, 401);
const unlocked = await request(endpoint, "POST", { pin: "123456" });
assert.equal(unlocked.status, 200);
const cookieHeader = unlocked.headers.get("set-cookie");
assert.match(cookieHeader, /HttpOnly/i);
assert.match(cookieHeader, /SameSite=strict/i);
assert.match(cookieHeader, new RegExp(`Path=/api/shoot-plans/${token}`));
const cookie = cookieHeader.split(";")[0];
const visible = await request(endpoint, "GET", undefined, cookie);
assert.equal(visible.status, 200);
assert.equal(visible.body.plan.title, plan.title);
assert.equal(visible.body.plan.shots[0].title, "Jollof close-up");
for (const key of ["id", "pinHash", "token", "version", "planId"])
  assert.ok(!Object.hasOwn(visible.body.plan, key));
assert.equal(
  (await request(`/api/admin/shoot-plans/${plan.id}`, "PATCH", plan, cookie))
    .status,
  401,
);
assert.equal((await request(endpoint, "PATCH", plan, cookie)).status, 405);
const second = await makePlan("Other private shoot");
const secondShare = (
  await request(
    `/api/admin/shoot-plans/${second.id}/share`,
    "PUT",
    { enabled: true, version: 0, pin: "123456" },
    adminCookie,
  )
).body.share;
const copiedCookie = cookie.replace(
  `shoot_share_${token}`,
  `shoot_share_${secondShare.token}`,
);
assert.equal(
  (
    await request(
      `/api/shoot-plans/${secondShare.token}`,
      "GET",
      undefined,
      copiedCookie,
    )
  ).status,
  401,
);
const expiredAt = Date.now() - 1000;
const expiredMac = createHmac("sha256", secret)
  .update(`shoot-share:${token}:1:${expiredAt}`)
  .digest("hex");
assert.equal(
  (
    await request(
      endpoint,
      "GET",
      undefined,
      `shoot_share_${token}=${expiredAt}.1.${expiredMac}`,
    )
  ).status,
  401,
);
assert.equal(
  (
    await request(
      endpoint,
      "GET",
      undefined,
      cookie.slice(0, -1) + (cookie.endsWith("0") ? "1" : "0"),
    )
  ).status,
  401,
);
const rotated = await request(
  settings,
  "PUT",
  { enabled: true, version: 1, pin: "654321" },
  adminCookie,
);
assert.equal(rotated.status, 200);
assert.equal((await request(endpoint, "GET", undefined, cookie)).status, 401);
assert.equal((await request(endpoint, "POST", { pin: "123456" })).status, 401);
const nextCookie = (await request(endpoint, "POST", { pin: "654321" })).headers
  .get("set-cookie")
  .split(";")[0];
assert.equal(
  (await request(endpoint, "GET", undefined, nextCookie)).status,
  200,
);
assert.equal(
  (await request(settings, "PUT", { enabled: false, version: 1 }, adminCookie))
    .status,
  409,
);
assert.equal(
  (await request(settings, "PUT", { enabled: false, version: 2 }, adminCookie))
    .status,
  200,
);
assert.equal(
  (await request(endpoint, "GET", undefined, nextCookie)).status,
  404,
);
assert.equal((await request(endpoint, "POST", { pin: "654321" })).status, 404);
const enabled = await request(
  settings,
  "PUT",
  { enabled: true, version: 3, pin: "112233" },
  adminCookie,
);
assert.equal(enabled.status, 200);
for (let i = 0; i < 10; i++)
  assert.equal(
    (await request(endpoint, "POST", { pin: "000000" })).status,
    401,
  );
const limited = await request(endpoint, "POST", { pin: "112233" });
assert.equal(limited.status, 429);
assert.equal(limited.headers.get("retry-after"), "600");
const logout = await request(endpoint, "DELETE", undefined, cookie);
assert.match(logout.headers.get("set-cookie"), /Max-Age=0/i);
console.log(
  "PASS: private-by-default, admin-only sharing, PIN gate, no pre-unlock content, safe DTO, scoped/expired/tampered sessions, read-only access, PIN rotation, disable/re-enable, conflict, persistent attempt budget and logout.",
);
