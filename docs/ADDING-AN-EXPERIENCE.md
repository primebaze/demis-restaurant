# Adding or changing a bookable experience

An "experience" is a fixed-price sitting guests book on its own page, separate
from normal table booking: the **Sunday Buffet** (Streatham Hill) and the
**Sunday Feast** (Cricklewood) today. This is the checklist for changing one,
or adding a new one such as a Monday lunch.

After any change, run:

```bash
npm run test:experiences
```

It checks the things that are easy to get out of step (see the end of this file).

---

## How the Sunday Feast is built

The feast runs on the system first built for the Saturday bottomless brunch.
Internal names still say "brunch" (files, database tables, API paths); everything
guests and staff see says Sunday Feast.

| Part | File |
|---|---|
| **Settings: day, site, price, times, party size** | `src/lib/saturday-brunch.ts` |
| Public page (menu, photos, details) | `src/app/sunday-feast/page.tsx` |
| Reservation form on that page | `src/app/sunday-feast/FeastBooking.tsx` |
| Booking API: availability, saving, emails, calendar invite | `src/app/api/saturday-brunch/route.ts` |
| Bookings on/off switch | `src/lib/brunch-settings.ts`, `src/app/api/admin/saturday-brunch/bookings-open/route.ts` |
| Admin page: reservations, sold out / hide per date, switch | `src/app/admin/saturday-brunch/page.tsx`, `src/app/api/admin/saturday-brunch/` |
| Door check-in screen (staff, PIN) | `src/app/brunch-checkin/page.tsx`, `src/app/api/brunch-checkin/route.ts` |
| Admin check-ins summary | `src/app/admin/brunch-checkins/page.tsx`, `src/app/api/admin/brunch-checkins/route.ts` |
| Database tables | `SaturdayBrunchBooking`, `BrunchDate`, `BrunchCheckIn` in `prisma/schema.prisma` |
| Photos | `public/feast/*.webp` |

Most changes are a single line in `src/lib/saturday-brunch.ts`:

- `SERVICE_WEEKDAY`: the day it runs (0 = Sunday, 1 = Monday … 6 = Saturday)
- `BRUNCH_LOCATION`, `BRUNCH_ADDRESS`: the site
- `BRUNCH_PRICE`: £ per person
- `FEAST_MIN_PARTY`, `FEAST_MAX_PARTY`: smallest and largest online booking
- `ARRIVAL_SLOTS`, `BRUNCH_START`, `BRUNCH_END`, `BRUNCH_END_MIN`, `SERVICE_END`: the hours
- `BOOKABLE_WEEKS`: how many upcoming dates guests can book at once (1 = just the next one)
- `BRUNCH_WINDOW_MIN`: the dining timer at the door

**Two copies to keep in step** (screens that run in the browser can't import the
settings file). The test fails if these drift:

- `FEAST_PRICE` in `src/app/brunch-checkin/page.tsx` must equal `BRUNCH_PRICE`
- `ARRIVAL_SLOTS` in `src/app/sunday-feast/FeastBooking.tsx` must equal the settings file

---

## Option A: change what the feast is (like brunch to feast)

Use this when the old experience is ending and the new one replaces it.

1. **Settings**: edit `src/lib/saturday-brunch.ts` (day, site, price, times, party size).
2. **Copies**: update `FEAST_PRICE` (door check-in) and `ARRIVAL_SLOTS` (booking form).
3. **Public page**: rewrite `src/app/sunday-feast/page.tsx` from the printed menu. Use the
   menu's own wording; don't invent hours, dishes or prices.
4. **New URL?** Rename the page folder, then add a permanent redirect from the old URL in
   `next.config.mjs` (`redirects()`), so old links and social posts still work.
5. **Photos**: convert to WebP, never commit the full-size JPGs:
   ```bash
   cwebp -q 78 -resize 1200 0 -metadata none photo.jpg -o photo.webp
   ```
   Use `-resize 1920 0` for the hero. Add the JPGs to `.gitignore`.
6. **Emails** (in `src/app/api/saturday-brunch/route.ts`): guest confirmation subject and
   text, admin notification heading, calendar invite title and end time.
7. **Wording** everywhere else: admin page, door check-in title, admin menu labels in
   `src/app/admin/layout.tsx`.
8. **Links to it**: the Book an Experience card in `src/components/BookingWidget.tsx`, the
   site menu in `src/components/FloatingMenu.tsx`, the Events page, `src/app/sitemap.ts`.
9. **Marketing emails**: the `{feast}` link in `src/lib/marketing.ts`, and any saved email
   in Email Blast or Bookings that mentions the old experience. Saved emails live in the
   database; the defaults in `src/app/api/admin/mailing/templates/route.ts` only seed a
   fresh database, so update existing ones in admin (or the database) too.
10. Run `npm run test:experiences`, `npx tsc --noEmit` and `npx next lint`.
11. The bookings switch keeps its last setting. Tell the owner to turn it on in admin.

## Option B: add a new experience alongside (e.g. Monday lunch)

Use this when the Sunday Feast carries on and a second experience runs as well.
Copy the feast's pieces rather than sharing them, so the two can differ:

1. **Database**: add tables for its bookings, date settings and check-ins (copy
   `SaturdayBrunchBooking`, `BrunchDate`, `BrunchCheckIn` in `prisma/schema.prisma`), then
   push the schema over port 5432:
   ```bash
   npx prisma db push
   ```
2. **Settings**: copy `src/lib/saturday-brunch.ts` to e.g. `src/lib/monday-lunch.ts`.
3. **Switch**: copy `src/lib/brunch-settings.ts` with a new `AppSetting` key.
4. **API**: copy `src/app/api/saturday-brunch/` and `src/app/api/admin/saturday-brunch/`,
   pointing at the new tables and settings. Check the emails and calendar invite wording.
5. **Pages**: copy `src/app/sunday-feast/` (page + form) and the admin page.
6. **Door check-in**: copy the screen and its API if staff check guests in at the door.
   Add its path to `ADMIN_PREFIXES` in `src/components/LayoutShell.tsx` so the public site
   header doesn't appear over the kiosk.
7. **Links**: admin menu, Book an Experience card, site menu, Events page, sitemap.
8. **Test**: add the new experience to `tests/experiences.test.ts` (copy the feast block).

---

## Going live

The GitHub repo is private and Vercel is on the Hobby plan, so a push alone shows
"Deployment Blocked". After pushing, start the production deployment from Vercel as
the account owner (Vercel connection `create_deployment`, `gitSource` = this repo,
`ref: main`, `sha` = the pushed commit). It builds in about two minutes.

## What the test checks

`tests/experiences.test.ts`:

- the door check-in price matches the settings price
- the booking form's fallback times match the settings times
- every arrival time is in order, on the half hour, and no later than closing
- the next bookable date always lands on the right weekday, and rolls to next week after close
- the right number of upcoming dates is offered, a week apart
- the feast package costs the settings price; old brunch bookings still read correctly
- the old `/saturday-brunch` URL redirects to `/sunday-feast`
- the site menu, Book an Experience card, Events page and sitemap all link to the page
- no "Saturday" or "brunch" wording is left on the feast page, its form, or its emails
