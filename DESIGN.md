---
version: alpha
name: "Demi’s admin"
description: "Restaurant operations and content planning in Demi’s existing dark and gold identity."
colors:
  primary: "#e8cc9c"
  background: "#0f0f0f"
  surface: "#1a1a1a"
  text: "#ffffff"
  muted: "#9ca3af"
  border: "#374151"
typography:
  sans:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
  display:
    fontFamily: "Cormorant Garamond, Georgia, serif"
rounded:
  control: "0.5rem"
  panel: "1rem"
spacing:
  panel: "1.25rem"
  section: "1.5rem"
components:
  button: {}
  field: {}
  feedback: {}
---

# Demi’s admin design system

## Overview

The admin serves Demi’s restaurant staff in London. It is an operational product,
used on laptops while planning and on phones during service and content shoots.
English copy uses UK dates and London scheduling. The public restaurant site is
more expressive; admin forms prioritise familiar controls and task clarity.

The weekly planner groups activity briefs by weekday; its content-shoot workspace borrows from a restaurant shoot sheet: ordered takes and a
large capture control. Shot numbers represent real capture order. Keep the rest
quiet: no marketing hero, decorative charts or stock imagery.

Runtime tokens remain canonical: `tailwind.config.ts` owns gold and font-family
aliases; `src/app/layout.tsx` loads Jakarta and Cormorant. Existing admin layout
and `src/components/admin/ShootPlanUI.tsx` own dark surfaces and field recipes.
This document mirrors those values; it does not generate another theme.

## Colors

Gold (`gold-300`) marks primary actions, focus, shot order and capture progress.
Near-black is the canvas and charcoal the panel. White is reserved for headings
and input values; gray-400 supplies readable supporting copy. Borders delineate
panels. Emerald labels captured/completed states; red labels errors. Always pair
state colours with text. The admin currently has one dark theme.

## Typography

Use Jakarta for admin headings, fields and body. Jakarta also carries the professional shoot-document title and video headings,
following the clean sans-serif treatment in the user’s supplied reference. Headings are 24px bold, section
headings 18px semibold, forms 14px, and short metadata 12px. Use tabular numbers
for shot order; preserve wrapping for full titles, notes and reference links.

## Layout

Preserve the existing 256px desktop admin sidebar and mobile navigation drawer.
Pages use existing 16px/32px outer padding. Shoot pages cap content at 72rem;
the weekly editor separates Week overview, Activities, Content plan, Preview, Shoot day and Sharing.
Video briefs use a 15rem selector beside the active video at desktop, stacked on mobile. Natural document scrolling owns the long form. Lists use
12-item server pagination. No new viewport-height restrictions on the admin shell.

## Elevation & Depth

Separate panels through flat tonal layers and borders. Dialogs use a dark
backdrop, not decorative shadows. Avoid animated or floating form panels.

## Shapes

Keep existing 8px controls and 16px panels. Status badges use pills. Capture
buttons are 48px square with rounded corners, distinct from compact metadata.

## Components

`ShootPlanUI.tsx` is the shared owner of planner actions, fields, status feedback,
progress and unsaved-navigation confirmation. Native select, date and time
controls retain platform popups and keyboard behaviour. Their geometry and
language may follow the device; the surrounding labels use UK English.

Actions have hover, focus-visible, pressed, disabled and busy treatments. A
failed request keeps draft values and displays recovery near the form. Feedback
uses a live region and text, not colour alone. Browser alert/confirm/prompt are
not used in the new planner. The app-owned native dialog handles modal focus.

Icons use the installed Lucide set, with text labels or accessible names. Motion
is limited to colour feedback. No new animation is needed for this workflow.

Mapping: primary → `gold-300`; text → `text-white`; muted → `text-gray-400`;
border → `border-gray-700`; control/panel → `rounded-lg`/`rounded-2xl`.
The global stylesheet owns scrollbar tokens and engine fallbacks.

The PIN-protected visitor view uses the same planner primitives in a narrow,
standalone layout, without admin navigation or the restaurant marketing footer.
The locked screen contains generic copy; titles and shoot content appear only
after authorisation. Sharing controls use concise labels without explainer paragraphs.

## Do's and Don'ts

- Do preserve existing restaurant branding and admin navigation.
- Do save capture changes only after server confirmation.
- Do make every shot action usable without dragging or hovering.
- Don’t replace intentional buffet pricing labels or business rules.
- Don’t use public marketing components for operational admin forms.

## Shoot document

The user supplied a professional shoot-guide reference with an overview, separate
video briefs, text overlays, shot lists and reference frames. `ShootPlanDocument`
is the single owner of that layout for Preview and the PIN-protected viewer.
Paper background `#faf9f6`, ink `#25221d`, neutral dividers, and large Jakarta
headings distinguish the document from the dark editing controls.
The document numbers videos in planned order, uses aligned label/value rows,
and shows reference images in a two-column mobile / three-column desktop gallery.
Images preserve their aspect ratio inside stable frames. All shoot content wraps;
no stock images, sample videos or explainer copy are seeded into real plans.


Weekly planning retains these same runtime tokens. The shared paper template groups work
under Monday–Sunday headings, followed by unscheduled activities and detailed video briefs.
Work type, owner and status remain concise metadata. Non-content activities use task fields;
existing shoot-specific details are retained in the Shoot details disclosure.
