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

Borders are white at low strength (`border-white/[0.06]`), not grey.

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
