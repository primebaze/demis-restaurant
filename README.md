This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Admin shoot plans

The private planner lives at `/admin/shoot-plans`. Staff can create a shoot brief,
order shots, add references and preparation notes, and use Shoot day to track
captures. All APIs use the existing admin session; stale versions return 409.

Before deploying this feature, apply `scripts/add-shoot-plans.sql`, then `scripts/add-shoot-plan-sharing.sql`, then `scripts/add-shoot-plan-checklist.sql`, then `scripts/add-shoot-plan-collaboration.sql`, then `scripts/add-shoot-plan-videos.sql`, to the target
PostgreSQL database, then run `npm run build` (which regenerates Prisma Client).
The SQL only adds planner/sharing tables, indexes and the empty checklist field; it can be run again safely and seeds no content.
This repository has no Prisma migration baseline; do not run `migrate deploy`
assuming this SQL is a baseline for the rest of the application.

### Isolated planner checks

The optional local harness needs `@electric-sql/pglite`,
`@electric-sql/pglite-socket` and `playwright` installed in the development
workspace. It uses an in-memory database and a test-only signing secret.

In separate terminals, start the test database and app:

```bash
node tests/start-shoot-test-db.mjs
NEXT_DIST_DIR=.next-shoot-tests ADMIN_JWT_SECRET=local-shoot-planner-test-only DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55439/postgres npm run dev -- --hostname 127.0.0.1 --port 3018
```

Then run:

```bash
node tests/shoot-plans-api.mjs
node tests/shoot-plans-browser.mjs
node tests/shoot-sharing-api.mjs
node tests/shoot-sharing-browser.mjs
node tests/shoot-checklist.mjs
node tests/shoot-collaboration.mjs
node tests/shoot-videos.mjs
```

The browser test defaults to installed Chrome; `PLAYWRIGHT_CHANNEL` overrides
that channel, and `PLAYWRIGHT_MODULE` can point to a bundled Playwright package.
These scripts only target the localhost test server. Stop the database process
to discard the test plans. Do not reuse the test secret on a deployed server.

### Keep the local preview available during builds

`npm run dev` uses `.next-dev`, while `npm run build` and `npm run start` use
`.next`. Test servers should set `NEXT_DIST_DIR` to their own folder, as above.
When testing a production build, use the same `NEXT_DIST_DIR` for both build
and start. A different port alone does not isolate Next.js build files.

### Sharing a shoot

Save a shoot, then use **Share this shoot** to set a six-digit PIN and enable
sharing. Copy the public link and share the PIN separately. Visitors see the
saved brief, all notes and shots at `/shoot-plans/[token]`, after unlocking.
Changing the PIN or turning sharing off invalidates existing visitor sessions.
PINs cannot be retrieved. Sessions last 12 hours and grant read-only access to
one plan; ten unlock attempts are allowed per link per ten-minute window.
Existing plans have sharing off until an admin explicitly enables it.

### Content checklist

Each shoot has a dated content checklist above its detailed shot list. Add short
deliverables such as a highlight reel or food review, reorder them and save.
In Shoot day, ticking an item saves its completion immediately. Visitors see
the saved items and their completion after entering the PIN, without edit controls.
Existing plans start with an empty checklist; no examples are seeded.

### Collaborator editing

On a saved shoot, use **Collaborator editing** to set a separate six-digit PIN
and enable the editing link. Copy **Collaborator link** from the deployed site,
then send that link and its PIN to your collaborator. They need no admin account.
They can edit this shoot’s brief, checklist, shots and status, and save for the team.
They cannot create other plans, access admin pages or change sharing settings.

Viewer and collaborator links have separate tokens, PINs and access sessions.
Turning collaborator editing off or changing its PIN invalidates editing sessions
without affecting viewer access. Editor saves check access and the saved version
inside a database transaction; a stale save preserves input and asks the editor to
reload. The editor does not refresh automatically and replace unsaved work.
Existing plans have no collaborator access until an admin enables it. No content
or sharing records are seeded by the schema script.

### Structured video plans

Use Shoot overview for the objective, visual direction, date and format. In Videos,
add each deliverable and its concept, on-screen text, shots and reference images.
Preview renders the same professional document used by the saved viewer link.
Shoot day groups capture controls by video. Sharing contains viewer and editor links.

Save a new plan before uploading reference images. JPG, PNG and WebP uploads are
limited to 3 MB each; the server strips metadata and stores private, resized WebP
images in the protected ShootReference table. No new storage bucket or environment
variable is required. Existing shots stay available as Additional shots and can be
assigned to videos. The schema script seeds no shoot content.


Weekly planning extends the existing shoot-plan routes and PIN links. Apply
`scripts/add-weekly-planning.sql` after the shoot-plan scripts, then run `prisma generate`.
It adds `weekStart` and `activities` only; it does not seed plans. Run
`node tests/weekly-plans.mjs` against the isolated test setup above to verify activities,
week filtering, compatibility and sharing permissions.
