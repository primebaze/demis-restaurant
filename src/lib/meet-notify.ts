/**
 * Notifications for Demi's Meetings.
 *
 * Every notification goes out twice (decided 16 Nov 2026): a phone notification
 * through Web Push (the home-screen app) AND an email to the address in the
 * clock-in app, so nobody misses a rota or an approval.
 *
 * Env (Vercel): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY. Make them once with
 *   npx web-push generate-vapid-keys
 */
import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { getClockinStaff, isManagerRole } from "@/lib/clockin";
import { buildGuestEmailHtml, sendViaResend } from "@/lib/email";

const PUBLIC = process.env.VAPID_PUBLIC_KEY || "";
const PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const APP_URL = "https://meeting.demisrestaurant.co.uk";

let ready = false;
function setup(): boolean {
  if (ready) return true;
  if (!PUBLIC || !PRIVATE) return false;
  webpush.setVapidDetails(APP_URL, PUBLIC, PRIVATE);
  ready = true;
  return true;
}

export function pushPublicKey(): string {
  return PUBLIC;
}

export type Notice = {
  title: string;
  body: string;
  /** Path inside the app to open when tapped, e.g. "/meet" */
  url?: string;
  /** Same tag replaces an older notification instead of stacking. */
  tag?: string;
  /** Material Symbol shown in the app's Notifications list (design 16). */
  icon?: string;
};

/**
 * Tell these people: push to every phone they have notifications on, and email
 * everyone who has an address (unless `email` is false). Turned-off staff are skipped.
 */
export async function notifyPeople(clockinIds: number[], notice: Notice, opts: { email?: boolean } = { email: true }) {
  const ids = Array.from(new Set(clockinIds));
  if (ids.length === 0) return { pushed: 0, emailed: 0 };

  const staff = await getClockinStaff().catch(() => []);
  const active = new Map(staff.filter((s) => s.active).map((s) => [s.id, s]));
  const targets = ids.filter((id) => active.has(id));

  // Every notice also lands in the person's Notifications list in the app (design 16).
  if (targets.length) {
    await prisma.meetAlert
      .createMany({ data: targets.map((clockinId) => ({ clockinId, title: notice.title.slice(0, 200), body: notice.body.slice(0, 600), url: notice.url || "/meet", icon: notice.icon || "notifications" })) })
      .catch(() => {});
  }

  const subs = await prisma.meetPushSub.findMany({ where: { clockinId: { in: targets } } });
  const reached = new Set<number>();
  let pushed = 0;

  if (setup() && subs.length) {
    const payload = JSON.stringify({ title: notice.title, body: notice.body, url: notice.url || "/meet", tag: notice.tag });
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24 });
          reached.add(s.clockinId);
          pushed++;
          await prisma.meetPushSub.update({ where: { id: s.id }, data: { lastOkAt: new Date() } }).catch(() => {});
        } catch (e) {
          // 404/410: the phone dropped this subscription (app removed, notifications turned off).
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) await prisma.meetPushSub.delete({ where: { id: s.id } }).catch(() => {});
        }
      }),
    );
  }

  let emailed = 0;
  if (opts.email !== false) {
    for (const id of targets) {
      const person = active.get(id);
      if (!person?.email) continue;
      const first = person.name.split(" ")[0];
      // No link: on a phone it opens Safari (the website), not the home-screen app, so the email
      // just tells them to open the app.
      const html = buildGuestEmailHtml(`Hi ${first},\n${notice.body}\nOpen the Demi's app on your phone to see it.\nThe Demi's team`);
      const ok = await sendViaResend(person.email, notice.title, html).catch(() => false);
      if (ok) emailed++;
    }
  }
  return { pushed, emailed };
}

/** Every switched-on manager in the clock-in app. */
export async function managerIds(): Promise<number[]> {
  const staff = await getClockinStaff().catch(() => []);
  return staff.filter((s) => s.active && isManagerRole(s.role)).map((s) => s.id);
}
