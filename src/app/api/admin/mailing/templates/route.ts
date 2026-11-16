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
 * {name} becomes the recipient's first name. {buffet} and {feast} become
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
  // ── Buffet screen. No greeting or sign-off: the buffet route wraps these in
  // "Hi <name>," and "Thanks, Demi's Restaurant, Streatham Hill".
  // Written to land in Primary: plain sentences, one link at most, no prices,
  // no "offer"/"free"/capitals, and a couple that ask for a reply.
  {
    key: "buffet-thank-you",
    name: "Thank you",
    scope: "buffet",
    sortOrder: 4,
    subject: "Thank you for coming on Sunday",
    body: `Thank you for coming to the Sunday buffet. It was really good to have you with us.

We're always trying to make it better, so if there was anything you loved, or anything you think we could do differently, just reply to this email and let us know. Every reply comes straight to us and we read them all.`,
  },
  {
    key: "buffet-miss-you",
    name: "It's been a while",
    scope: "buffet",
    sortOrder: 5,
    subject: "It's been a little while",
    body: `It's been a little while since you came to our Sunday buffet, so we thought we'd say hello.

The buffet is still on every Sunday at Streatham Hill, and the menu changes each week, so there's always something new on the table alongside the favourites like jollof, oxtail and beef ribs.

Doors open at 12pm and the buffet starts at 12:30pm. The earlier you arrive, the less you pay.

If you fancy coming back, you can book a table here:

https://www.demisrestaurant.co.uk/sunday-buffet

It would be lovely to see you again.`,
  },
  {
    key: "buffet-this-weekend",
    name: "This weekend",
    scope: "buffet",
    sortOrder: 6,
    subject: "Are you free on Sunday?",
    body: `Just a note before the weekend: we're doing the buffet again this Sunday at Streatham Hill.

Doors open at 12pm and the buffet starts at 12:30pm. If you'd like to come, it's easiest to book ahead so we can keep a table for you:

https://www.demisrestaurant.co.uk/sunday-buffet

Hope to see you there.`,
  },
  {
    key: "buffet-bring-the-group",
    name: "Bring the group",
    scope: "buffet",
    sortOrder: 7,
    subject: "Planning something with friends or family?",
    body: `If you've got a birthday, a catch-up or a family get-together coming up, the Sunday buffet is an easy way to do it. Everyone eats as much as they like, and nobody has to agree on one dish.

Just tell us how many of you there are when you book and we'll keep a table that fits:

https://www.demisrestaurant.co.uk/sunday-buffet

If it's a bigger group, reply to this email and we'll help you sort it out.`,
  },

  // ── Bookings screen. Same idea: the bookings route adds "Hi <first name>,"
  // and "Thanks, Demi's Restaurant" around these.
  {
    key: "bookings-thank-you",
    name: "Thank you",
    scope: "bookings",
    sortOrder: 1,
    subject: "Thank you for dining with us",
    body: `Thank you for coming to eat with us at Demi's. We really hope you enjoyed it.

If you have a moment, we'd love to hear how it went. Just reply to this email with anything you liked, or anything we could do better. It all comes straight to us.`,
  },
  {
    key: "bookings-miss-you",
    name: "It's been a while",
    scope: "bookings",
    sortOrder: 2,
    subject: "It's been a little while",
    body: `It's been a little while since you came to Demi's, so we wanted to say hello.

We're open every day from 12pm at both Cricklewood and Streatham Hill, and the kitchen is still cooking the dishes you know: jollof, suya, pepper soup, asun and plenty more.

If you'd like to come back, you can book a table here:

https://www.demisrestaurant.co.uk/booking

We'd be really happy to see you again.`,
  },
  {
    key: "bookings-whats-on",
    name: "What's on",
    scope: "bookings",
    sortOrder: 3,
    subject: "What's on at Demi's",
    body: `A quick note on what's happening at Demi's at the moment.

On Fridays there's a live Afrobeats night at Cricklewood from 8pm, with Deejay Why on the decks.

On Sundays there's our all you can eat buffet at Streatham Hill, from 12pm.

And also on Sundays, our Sunday Feast at Cricklewood, 1:30pm to 6pm: three courses to share for £30 per person.

You'll find all of them on our website, where you can book a table too:

https://www.demisrestaurant.co.uk`,
  },
  {
    key: "bookings-celebrations",
    name: "Celebrations",
    scope: "bookings",
    sortOrder: 4,
    subject: "Got something to celebrate?",
    body: `If you've got a birthday, an anniversary or a get-together coming up, we'd love to host it.

We can look after bigger groups, and for larger occasions we also do private hire. Just reply to this email with the date and roughly how many people, and we'll take it from there.

Or if you'd rather book a table yourself:

https://www.demisrestaurant.co.uk/booking`,
  },
  {
    // Key kept from the Saturday brunch template it replaced, so it updates in place.
    key: "saturday-brunch",
    name: "Sunday Feast",
    scope: "blast",
    sortOrder: 2,
    subject: "New at Demi's: the Sunday Feast",
    body: `Hi {name},

We've just started something new at Cricklewood: the Sunday Feast, every Sunday from 1:30pm to 6pm.

For two or more people, it's £30 per person for everything on the menu, all to share: puff puff, meat pie and fish roll to start, then pepper soup, moi moi and house salad, then a whole rotisserie chicken and a whole grilled fish, with smoky party jollof rice and sweet fried plantain. It comes with one winter warmer each too.

You can reserve a table here: {feast}

Hope to see you soon.

Warmly,
The team at Demi's`,
  },

  // ── Sunday Feast screen. No greeting or sign-off: the feast route wraps these in
  // "Hi <name>," and "Thanks, Demi's Restaurant, Cricklewood". {feast} becomes a
  // tracked link to the booking page.
  {
    key: "feast-see-you-sunday",
    name: "See you Sunday",
    scope: "feast",
    sortOrder: 1,
    subject: "See you on Sunday",
    body: `Just a quick note to say we're looking forward to having you at the Sunday Feast this weekend.

We serve from 1:30pm at Cricklewood. Everything comes to the table to share, so come hungry.

If your plans change or you need to move your table, just reply to this email and we'll sort it out.`,
  },
  {
    key: "feast-thank-you",
    name: "Thank you",
    scope: "feast",
    sortOrder: 2,
    subject: "Thank you for coming on Sunday",
    body: `Thank you for joining us for the Sunday Feast. It was really good to have you with us.

We're still shaping the menu, so if there was a dish you loved, or anything you think we could do differently, just reply and let us know. Every reply comes straight to us and we read them all.`,
  },
  {
    key: "feast-miss-you",
    name: "It's been a while",
    scope: "feast",
    sortOrder: 3,
    subject: "It's been a little while",
    body: `It's been a little while since you came to the Sunday Feast, so we thought we'd say hello.

It's still on every Sunday at Cricklewood from 1:30pm to 6pm: puff puff and meat pie to start, pepper soup and moi moi, then a whole rotisserie chicken and grilled fish with party jollof and plantain, all to share.

If you fancy coming back, you can book a table here: {feast}

It would be lovely to see you again.`,
  },
  {
    key: "feast-this-weekend",
    name: "This weekend",
    scope: "feast",
    sortOrder: 4,
    subject: "Are you free on Sunday?",
    body: `Just a note before the weekend: the Sunday Feast is on again this Sunday at Cricklewood, from 1:30pm to 6pm.

It's for two or more, and everything is shared, so it's a good one to bring someone along to. Booking ahead means we can keep a table for you: {feast}

Hope to see you there.`,
  },
  {
    key: "feast-bring-the-group",
    name: "Bring the group",
    scope: "feast",
    sortOrder: 5,
    subject: "Planning something with friends or family?",
    body: `If you've got a birthday, a catch-up or a family get-together coming up, the Sunday Feast is an easy way to do it. The whole table shares everything, and nobody has to agree on one dish.

Tell us how many of you there are when you book and we'll keep a table that fits: {feast}

If it's a bigger group, reply to this email and we'll help you sort it out.`,
  },

  // ── Single-guest emails (dashboard "Email guest" and the Guests page). The
  // guest route sends the text exactly as written, so these carry their own
  // greeting and sign-off.
  {
    key: "guest-see-you-today",
    name: "See you today",
    scope: "guest",
    sortOrder: 1,
    subject: "Looking forward to seeing you today",
    body: `Hi {name},

Just a quick note to say your table is booked and we're looking forward to seeing you today.

If you're running late or your plans change, just reply to this email and we'll keep things flexible for you.

Warmly,
The team at Demi's`,
  },
  {
    key: "guest-running-late",
    name: "Are you on your way?",
    scope: "guest",
    sortOrder: 2,
    subject: "Your table at Demi's",
    body: `Hi {name},

We've got your table ready and just wanted to check you're still coming. If you're running a little late, no problem, just reply and let us know roughly when you'll be here so we can hold it for you.

Thanks,
The team at Demi's`,
  },
  {
    key: "guest-requirements",
    name: "About your request",
    scope: "guest",
    sortOrder: 3,
    subject: "About your booking request",
    body: `Hi {name},

Thank you for your booking. We saw the note you left with it and wanted to let you know we've passed it on to the team, so everything will be ready when you arrive.

If there's anything else we should know, just reply to this email.

Warmly,
The team at Demi's`,
  },
  {
    key: "guest-thank-you",
    name: "Thank you",
    scope: "guest",
    sortOrder: 4,
    subject: "Thank you for dining with us",
    body: `Hi {name},

Thank you for coming to eat with us at Demi's. We really hope you enjoyed it.

If you have a moment, we'd love to hear how it went. Just reply to this email with anything you liked, or anything we could do better. It all comes straight to us.

Warmly,
The team at Demi's`,
  },
  {
    key: "guest-miss-you",
    name: "It's been a while",
    scope: "guest",
    sortOrder: 5,
    subject: "It's been a little while",
    body: `Hi {name},

It's been a little while since you came to Demi's, so we wanted to say hello.

We're open every day from 12pm at both Cricklewood and Streatham Hill. On Sundays there's the all you can eat buffet at Streatham Hill ({buffet}) and the Sunday Feast at Cricklewood ({feast}).

It would be really good to see you again.

Warmly,
The team at Demi's`,
  },
  {
    key: "guest-celebrations",
    name: "Celebrations",
    scope: "guest",
    sortOrder: 6,
    subject: "Got something to celebrate?",
    body: `Hi {name},

If you've got a birthday, an anniversary or a get-together coming up, we'd love to host it.

We can look after bigger groups, and for larger occasions we also do private hire. Just reply to this email with the date and roughly how many people, and we'll take it from there.

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

/** GET ?scope=blast|buffet|bookings|feast|guest — saved templates for one screen. */
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

  const where = scope === "buffet" || scope === "bookings" || scope === "feast" || scope === "guest" ? scope : "blast";
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
