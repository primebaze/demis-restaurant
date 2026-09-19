# Admin shoot-planning contract

Scope: the shoot planner added under `/admin/shoot-plans`. Older workflows are
implementation evidence, not a request to rewrite every existing admin screen.
Visual context is in [DESIGN.md](DESIGN.md).

## Business context

| Evidence | UI consequence |
|---|---|
| User request: a shoot-plan admin page for Demi’s restaurant content | Admin planning with explicitly enabled PIN-protected public viewing; no external messages |
| `src/lib/admin-auth.ts` and sibling admin APIs | Admin session required on management routes; scoped PIN session required on public reads |
| `src/app/admin/layout.tsx` | Use existing admin navigation and mobile drawer |
| `prisma/schema.prisma` / shoot-plan API | Plans and ordered shots persist separately; saves atomically check a version |
| Existing Cricklewood / Streatham restaurant pages | Offer those two locations; dates and times are London local |

No money, booking changes, irreversible plan deletion or new user-role policy
is introduced. Cancelling a shoot is a reversible status change. This feature
has no retention or automatic deletion job.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | Native select styled through ShootPlanUI.fieldClass | This contract | Platform-owned popup | Browser selection + keyboard |
| Date | Native date/time controls with shared field style | This contract | Optional London calendar date/time | Browser + API calendar validation |
| Form | ShootPlanUI.Field and lib/shoot-plans.parseShootDraft | Shared parser | Create / edit | Invalid submit and API tests |
| Scrollbar | app/globals.css | DESIGN.md | Global baseline | Computed CSS |
| Toast | ShootPlanUI.Feedback (inline live region) | This contract | Success / error | Browser response states |
| CRUD | Shoot-plan API and editor | Existing admin authentication | Create → detail; save → same detail | API + browser tests |

## Behaviour

- List uses server pagination (12 shoots), status filter and page in the URL.
  Empty, loading, error and retry are separate states. API failure is not an
  empty list. Sorting is most recent scheduled date first, then creation time.
- Create opens the saved detail because the next task is refining shots. Save
  stays on the detail. This is a business-specific planner continuation.
- Full plan edits save explicitly. Capture mode requires a saved draft and
  persists each capture separately. Captures do not automatically complete the
  shoot; status is controlled by staff.
- Shot order changes use accessible move-up/down actions. Removal from a draft
  has Undo before saving. Admins can permanently delete saved plans through an app-owned confirmation; related activities, shots, references and sharing records are removed.
- Failed saves preserve input. Version conflicts never silently overwrite.
  Offer Copy my edits and Reload latest plan. An expired session offers sign-in
  in another tab so the draft stays open.
- Creation has a stable client UUID for safe retries. Writes are disabled while
  pending. Failed network responses do not claim that a write definitely failed.
- Dirty forms warn for in-app link navigation and real page unload. Native dialog
  supplies focus trapping, Escape, inert background and focus restoration.
- Native input popups are deliberately platform-owned. Forms use noValidate,
  app-owned inline errors, focus on invalid fields and real label associations.
- No client-side permanent draft storage. No automatic external publishing.

## Existing drift

Existing admin screens use browser confirmations and duplicate field markup.
This feature introduces shared planner primitives without changing those flows.
The existing hidden scrollbar is replaced with a visible global baseline to keep
long shot lists usable. Intentional buffet tier labels remain untouched.

## PIN-protected sharing

The user requested public links protected by a PIN. Each saved plan can opt in
through Share this plan; existing plans stay private. Enabling sharing exposes
the saved brief, all shoot notes and all shots to anyone with its link and PIN.
The controls identify viewer sharing and collaborator editing. Visitors cannot edit.

- A cryptographically random link token and hashed six-digit PIN live in a
  separate ShootPlanShare record. No plaintext PIN or hash is returned to clients.
- Admin sharing updates check a separate version. Rotating the PIN or disabling
  sharing increments it, invalidating all older visitor sessions.
- Visitor cookies are HttpOnly, SameSite Strict, Secure in production, scoped
  to that link’s API, and expire after 12 hours. They grant no admin permissions.
- An atomic database budget allows ten PIN attempts per link per ten minutes,
  including successful attempts, across all server instances.
- All three shoot tables use row-level security without public policies. Only
  the server database role can read them directly.
- Public routes have generic metadata, no indexing, no caching and no referrer
  disclosure. No plan content is rendered or fetched before PIN validation.
- The view refreshes every minute while visible and on returning to the tab.
  A revoked/expired session removes plan content on the next access check.
- Sharing controls are a separate explicit-save form. They share only already
  saved plan data. Visitors can manually refresh or lock their browser session.

## Content checklist

- A dated checklist above the detailed shots lists content deliverables, with
  circular checkboxes, multiline text and a completed count.
- Admins add, reorder and remove items with Undo in the editor, then save.
  Shoot day saves each completion immediately and reports failures.
- Public visitors see saved checklist text and static completion indicators
  only after unlocking. Empty public checklists are omitted.
- Existing plans receive an empty list. Example wording stays in code comments;
  no content is seeded. Older clients that omit the field preserve saved items.

## Collaborator editing

- An independent PIN-protected editing link grants access to one saved plan.
  Only admins can enable it, change the PIN or turn it off. The section is labeled
  Collaborator editing. Viewer links remain read-only.
- Collaborators use the same brief, checklist and shot editor, without admin
  navigation, plan creation or sharing settings. Dirty forms retain navigation
  protection. Lock is disabled while changes are unsaved.
- Editing cookies use a distinct signature domain, name and API path; viewer
  cookies cannot grant write access. Each link has an independent attempt budget.
- Saves derive the plan ID from the access record and lock that record during
  the write, serializing revocation with saves. Admin and collaborator writes use
  shared validation and version conflict protection. Failed writes retain drafts.
- No background refresh replaces an editor draft. Expired sessions offer unlock
  in a new tab; conflicts offer Copy my edits and Reload latest plan.
- The separate ShootPlanEditorShare table has RLS enabled with no public policies.
  Its schema adds no records and enables no existing plans for collaboration.

## Interface copy

The user requested no explainer copy on the shoot-plan screens. Keep guidance
in source comments; render concise labels, statuses, error recovery and plan data.

## Overview, videos and reference images

- User request: simple Shoot overview → Content plan and a professional shared
  template. The editor uses five named sections, retaining draft state across
  section switches. Sharing is a separate section for admins only.
- Each video owns its concept, style/audio, on-screen text and reference frames.
  Shots have a video ID; existing ungrouped shots appear under Additional shots.
  Video order and shot order use accessible buttons. Removal offers Undo.
- Existing checklists and shots remain intact. Older clients preserve unknown
  overview/video fields and shot group IDs. Save conflicts retain draft input.
- `PlanText` composes the canonical Field and fieldClass; `ShootShotEditor` owns
  grouped shot editing; `ShootReferenceEditor` owns upload states; the same
  `ShootPlanDocument` renders draft previews and saved public plans.
- Private reference images are stored in ShootReference (RLS, no public policies),
  served only after the matching plan's admin/viewer/editor access check. No public
  storage URL, external image proxy or cache bypasses the PIN gate.
- Uploads accept JPG/PNG/WebP up to 3 MB, decode at most 40 megapixels, strip metadata
  and store WebP at up to 1400px / 500KB. Six references per video and 120 assets per
  shoot bound storage. Reference removal updates the draft and offers Undo; stored
  assets are retained so other open drafts keep working. No automatic deletion job.
- A new shoot must be saved before uploading references. Uploads expose pending,
  cancel, failure and retry states. Stable IDs make retries idempotent. Uploading
  prevents save/navigation within the editor until resolved.
- Viewer sessions cannot upload. Editor uploads recheck access under the same
  access-row lock used for saves; disabled access cannot commit new images.


## Weekly planning

- Source: user request and confirmed choice of one weekly plan containing several activities.
- Existing shoot-plan routes and PIN links remain stable. Additive `weekStart` and `activities`
  fields retain old records; no plans are seeded. Old clients preserve weekly fields and video associations.
- Week overview → Activities → optional Content plan / Shoot day → Preview → Sharing.
  Week starting uses the canonical native date field, normalised to Monday; API validation
  rejects invalid weeks. A scheduled week is required when activities exist.
- Each activity has a title, selectable work type/day/status, owner and notes. Types are
  Content shoot, Web development, Website maintenance, Social media, Design and Other.
- Content shoots link to video briefs. Changing an activity type or removing it detaches
  the briefs without deleting them. Undo restores the association while the editor stays open.
- `WeeklyActivityEditor` composes existing Field/PlanText/Action primitives. Saved activities
  are rendered by the shared document as a Monday–Sunday agenda with unscheduled work last.
- Week and status filters stay in the list URL, reset pagination and retain error/retry handling.
- `ConfirmDelete` is the shared app-owned destructive modal, using native dialog focus/inert
  behavior and initial Cancel focus. Existing PIN scope and save conflict protections apply.

- Planner back navigation, title, save controls and section tabs share a sticky header.
  Planner routes use document scrolling; other admin routes retain their scroll owner.
  Tabs scroll horizontally on narrow screens. Header height is bounded on short screens,
  and measured scroll padding keeps focused fields and preview anchors unobscured.
