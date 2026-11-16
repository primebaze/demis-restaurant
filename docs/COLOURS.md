# Colour rules

One palette for the whole site: the guest pages, the admin, the door kiosks and
the blog. If a colour isn't on this page, don't use it.

Check it with:

```bash
npm run test:colours
```

---

## 1. Backgrounds: `ink` only

Five dark shades, set in `tailwind.config.ts`. Never type a hex black like
`bg-[#1a1a1a]`: use the name.

| Token | Hex | Guest site | Admin and kiosks |
|---|---|---|---|
| `ink-950` | `#111111` | darker section bands, inputs | page, sidebar, inputs |
| `ink-900` | `#1a1a1a` | **page** | cards |
| `ink-800` | `#222222` | **cards** | raised panels, modals |
| `ink-700` | `#2a2a2a` | a card inside a card, form fields in booking | chips, hover |
| `ink-600` | `#333333` | hover on `ink-700` | |

**The step rule:** a card is one step lighter than what it sits on. An input is
one step darker than the card it's in. Every page on the guest site uses
`ink-900` as its page colour, including Sunday Buffet and Sunday Feast.

**Borders and dividers are white at low strength, never solid grey.** Solid
`stone-700` / `stone-800` borders look brown and muddy on the black.

| Use | Class |
|---|---|
| Card edge, table rows, dividers | `border-white/[0.06]` |
| Inputs, buttons, stronger edges | `border-white/10` |
| Very faint (rows inside a card) | `border-white/[0.04]` |

Grey fills (chips, toggles when off, empty bars) work the same way:
`bg-white/[0.06]` or `bg-white/10`, never `bg-stone-700`.

**Stat cards are all the same.** Don't tint one or two of a row gold; if a
number matters most, put it first.

## 2. Greys: `stone` only

Tailwind's `gray`, `slate`, `zinc` and `neutral` are cold and slightly blue, and
look out of place next to the gold. Use `stone` (warm) for all grey text, icons
and borders.

- Main text: `text-white`
- Secondary text: `text-stone-300` / `text-stone-400`
- Hints, labels, captions: `text-stone-500`
- Disabled: `text-stone-600`

## 3. Accent: gold only

`gold-300` is the one brand colour: buttons, the active item, prices, the NEW
badge, highlights. Use it sparingly, so it stands out where it's used.

No blue, purple, pink, sky, teal, orange or other colours for decoration or to
tell categories apart. For category tags (booking source, email type), use a
quiet chip (`bg-white/[0.06] text-stone-200`), with gold for the main one.

## 4. Status colours: three, with fixed meanings

| Colour | Meaning | Examples |
|---|---|---|
| `emerald` | done, confirmed, success | Confirmed, Sent, Active |
| `amber` | waiting, needs attention | Pending, Queued, Low stock |
| `red` | cancelled, failed, error, delete | Cancelled, Failed, Sign out hover |

`green` is not used (it's `emerald`). "Modified" and "in progress" are gold:
they're changes, not problems.

## 5. Icons

Line icons from `lucide-react` at `strokeWidth={1.75}`, coloured `stone-500`,
gold when active. No emoji in menus or headings. (The blog admin menu still
has emoji; switch it to line icons next time it's changed.)

## 6. Admin (redesigned Nov 2026)

The admin (`/admin`) has its own look, approved in the redesign. Sections 1 to 5
still apply to the guest site, the door kiosks and the blog.

- **Background:** the Demi's dining room photo (`public/admin/dining-room.jpg`,
  class `admin-bg` in `src/app/admin/admin.css`). Nothing else goes behind pages.
- **On the photo:** white text, frosted panels (`glass`) and dark glass buttons.
- **Content:** warm ivory sheets (`bg-sand-50`, rounded 22px) with `stone` text.
  Inside them: `sand-100` for inputs, `sand-200` for tiles and tracks, `sand-300`
  for strong lines. No pure white panels (they glare on big screens).
- **Popups** are dark frosted panels with white text (add `popup-dark` to the
  popup's outer panel; `admin.css` remaps the light classes inside it). The page
  behind dims with `bg-black/65`. Pages themselves stay ivory.
- **Accent: honey gold** (`honey-300`, #f4d47f, with `text-ink-900`). The
  website's `gold-300` looked muddy on white, so the admin uses this brighter
  gold instead: main buttons, the
  active day, the arrow buttons, and the one number that matters most in a group.
  On white, gold text is `gold-700`. Solid fills only: no dots, stripes or
  patterns.
- **Ember (rust), admin only:** booking dots on the calendars (`ember-400`),
  guest requirements on bookings (`text-ember-700`), Set Menu selection bars
  (`ember-400`), and the warm tint behind an opened or selected table row
  (`bg-ember-50`, with the details on a white card) and the initials circles
  (`bg-ember-100 text-ember-700`). Nowhere else.
- **Text on white is never gold.** Use `stone-900` for main text and `stone-500`
  for hints (never lighter than `stone-500` on white). Gold is only a solid fill (`bg-honey-300` with `text-ink-900`).
- **Status:** the same three meanings, light versions on white: `emerald-50/700`
  (done), `amber-50/800` (waiting), `red-50/700` (cancelled, failed). Modified is
  `gold-100/800`.
- **Font:** Outfit (`font-outfit`), light weights for big numbers and titles.
- Pages not redrawn yet sit on a dark `ink-950` panel inside the new shell, so
  their old ink and gold styles still read correctly. Add a page to
  `REDESIGNED` in `src/app/admin/AdminShell.tsx` once it's redrawn.

## Allowed exceptions

These are real brand colours, not ours, and the test lets them through:

- Share buttons: WhatsApp `#25D366`, Facebook `#1877F2`, LinkedIn `#0A66C2`,
  Instagram `#E4405F` (`src/app/blog/[slug]/ShareButtons.tsx`)
- The Instagram icon gradient on the homepage (amber to pink to purple)
- Emails (`src/app/api/`): email clients can't read Tailwind, so emails use
  inline hex. Keep them to the same colours: dark `#141210`, gold `#e8cc9c` /
  `#e3c07a`.
- Printed or light documents (the weekly plan): `cream-50` background with
  `stone` text.

To allow another one, add the file and a reason to `ALLOWED` in
`tests/colours.test.ts`.
