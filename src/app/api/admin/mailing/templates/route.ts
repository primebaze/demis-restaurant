import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * Saved subject + body for the emails that go out regularly.
 *
 * Seeded on first read so a fresh database comes up with the wording already in
 * place; after that the admin owns them and nothing here overwrites an edit.
 *
 * {name} becomes the recipient's first name. {buffet} and {brunch} become
 * tracked links to those pages, so clicks are attributable to the person who
 * received the email while the public pages stay uncounted.
 */
const DEFAULTS = [
  {
    key: "sunday-buffet",
    name: "Sunday buffet",
    scope: "blast",
    sortOrder: 1,
    subject: "Our Sunday buffet is back this week",
    body: `Hi {name},

Just a quick one, our Sunday buffet is back this week at Streatham Hill.

We've switched up the menu again (we do it every week), so there's a fresh spread waiting: jollof, fried rice, rice and peas, grilled turkey, oxtail, beef ribs and plenty more. All you can eat, help yourself to as much as you like.

Doors open at 12pm and the buffet starts at 12:30pm. Remember, the earlier you arrive, the less you pay, so it's worth coming down early.

Reserve your spot below and we'll save you a table.

{buffet}

See you Sunday. Come hungry.

Warmly,
The team at Demi's`,
  },
  {
    key: "buffet-follow-up",
    name: "Follow-up",
    scope: "buffet",
    sortOrder: 3,
    subject: "Coming back this Sunday?",
    // No greeting or sign-off: the buffet route adds "Hi <name>," and
    // "Thanks, Demi's Restaurant, Streatham Hill" around whatever is written here.
    body: `Thank you for joining us at the buffet last Sunday. We hope it was worth the trip.

We're running it again this Sunday, and the menu changes every week, so there'll be a fresh spread waiting: jollof, fried rice, rice and peas, grilled turkey, oxtail, beef ribs and plenty more. All you can eat, as always.

Doors open at 12pm and the buffet starts at 12:30pm. The earlier you arrive, the less you pay, so it's worth coming down early.

If you'd like us to save you a table, you can book here:

https://www.demisrestaurant.co.uk/sunday-buffet

We'd love to have you back.`,
  },
  {
    key: "saturday-brunch",
    name: "Saturday brunch",
    scope: "blast",
    sortOrder: 2,
    subject: "Something new: Saturday bottomless brunch",
    body: `Hi {name},

We wanted you to be among the first to know we've just added something new: a Saturday bottomless brunch, 1pm to 4:30pm, £35 per person.

It's unlimited sides, potato and sweet potato fries, roasted potatoes, grilled plantain, shawarma, seafood like scallops, mussels, prawns and grilled fish, plus beef ribs, striploin, suya, lamb chops and asun from the grill.

If Sundays are hard to make, this might suit you better. And of course the buffet is still on every Sunday.

You can reserve a table here: {brunch}

Hope to see you soon.

Warmly,
The team at Demi's`,
  },
];

const SEEDED_KEY = "email_templates_seeded";

/**
 * Creates any default that has never been seeded before.
 *
 * Keyed off a record of what we've already inserted rather than "is the table
 * empty", so a new default added later still appears, and one the admin deleted
 * on purpose does not come back.
 */
async function ensureSeeded() {
  const marker = await prisma.appSetting.findUnique({ where: { key: SEEDED_KEY } });
  const already = new Set((marker?.value || "").split(",").filter(Boolean));

  const missing = DEFAULTS.filter((d) => !already.has(d.key));
  if (missing.length === 0) return;

  await prisma.emailTemplate.createMany({ data: missing, skipDuplicates: true });

  const value = [...Array.from(already), ...missing.map((d) => d.key)].join(",");
  await prisma.appSetting.upsert({
    where: { key: SEEDED_KEY },
    create: { key: SEEDED_KEY, value },
    update: { value },
  });
}

/** GET ?scope=blast|buffet — saved templates for one screen. */
export async function GET(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureSeeded();
  const scope = new URL(req.url).searchParams.get("scope") || "blast";
  const templates = await prisma.emailTemplate.findMany({
    where: { scope },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ templates });
}

/** POST — create a template, or overwrite one with the same key. */
export async function POST(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, subject, body, scope } = await req.json();
  if (!name?.trim() || !subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Name, subject and message are all required" }, { status: 400 });
  }

  const where = scope === "buffet" ? "buffet" : "blast";
  const slug =
    String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || "template";
  // Scoped, so "Follow-up" saved on the buffet screen never overwrites a
  // "Follow-up" on the blast screen — they go to different people.
  const key = `${where}:${slug}`;

  const fields = {
    name: String(name).slice(0, 60),
    subject: String(subject).slice(0, 200),
    body: String(body),
    scope: where,
  };

  const saved = await prisma.emailTemplate.upsert({
    where: { key },
    create: { key, ...fields },
    update: fields,
  });

  return NextResponse.json({ template: saved });
}

/** DELETE ?key=sunday-buffet */
export async function DELETE(req: Request) {
  const { unauthorized } = await requireAdmin();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = new URL(req.url).searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  await prisma.emailTemplate.deleteMany({ where: { key } });
  return NextResponse.json({ deleted: true });
}
