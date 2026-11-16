/**
 * Building blocks for the redesigned admin (Nov 2026): a big light page title
 * over the dining room photo, a frosted stat strip, and white "sheets" for the
 * content. See docs/COLOURS.md, "Admin".
 */
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";

export function PageHead({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-5 md:mb-6">
      <div className="min-w-0">
        <h1 className="font-outfit text-4xl md:text-5xl lg:text-[56px] font-light tracking-tight leading-[1.05] text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.3)]">
          {title}
        </h1>
        {subtitle && <p className="mt-2 text-sm md:text-[15px] font-light text-white/85">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Frosted strip of headline numbers that sits on the photo. */
export function GlassStats({ items }: { items: { label: string; value: ReactNode; hint?: string }[] }) {
  return (
    <section
      aria-label="Numbers"
      className="glass rounded-[22px] grid grid-cols-2 sm:grid-cols-3 lg:grid-flow-col lg:auto-cols-fr gap-y-1 px-1.5 py-2 mb-4"
    >
      {items.map((s) => (
        <div key={s.label} className="px-4 py-2.5 text-white">
          <div className="text-[13px] font-light text-white/85">{s.label}</div>
          <div className="mt-0.5 text-2xl md:text-[26px] font-light">{s.value}</div>
          {s.hint && <div className="text-[11px] font-light text-white/70">{s.hint}</div>}
        </div>
      ))}
    </section>
  );
}

/** White content panel. */
export function Sheet({ children, className = "", label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <section aria-label={label} className={`rounded-[22px] bg-sand-50 text-stone-900 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.6)] ${className}`}>
      {children}
    </section>
  );
}

export function SheetTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="font-outfit text-xl font-normal tracking-tight text-stone-900">{children}</h2>
      {aside && <div className="ml-auto flex items-center gap-2">{aside}</div>}
    </div>
  );
}

const TONES = {
  ok: "bg-emerald-100 text-emerald-800",
  wait: "bg-amber-100 text-amber-900",
  bad: "bg-red-100 text-red-800",
  off: "bg-sand-200 text-stone-700",
  hot: "bg-sand-200 text-stone-800",
  gold: "bg-sand-200 text-stone-800",
} as const;
export type Tone = keyof typeof TONES;

export function Tag({ tone = "off", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-xs whitespace-nowrap ${TONES[tone]}`}>{children}</span>;
}

/** Booking status to tag colour, shared by every bookings list. */
export function statusTone(status: string): Tone {
  if (["confirmed", "active", "arrived", "completed_ok"].includes(status)) return "ok";
  if (["pending_payment", "pending", "booked", "queued"].includes(status)) return "wait";
  if (["cancelled", "no_show", "failed"].includes(status)) return "bad";
  if (status === "modified") return "hot";
  return "off";
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending_payment: "Awaiting deposit",
    no_show: "No-show",
  };
  return map[status] || status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
}

/** Button looks. Glass ones sit on the photo; plain ones sit on white sheets. */
export const btn = {
  glass:
    "inline-flex items-center gap-2 h-11 px-4 rounded-full text-[15px] font-light text-white bg-[rgba(58,52,48,0.48)] border border-white/10 backdrop-blur-xl hover:bg-[rgba(58,52,48,0.65)] transition",
  primary:
    "inline-flex items-center gap-2 h-11 px-5 rounded-full text-[15px] font-medium text-ink-900 bg-honey-300 hover:bg-honey-200 transition disabled:cursor-not-allowed disabled:bg-sand-300 disabled:text-stone-500",
  light:
    "inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm text-stone-900 bg-sand-50 border border-sand-300 hover:border-stone-300 transition disabled:cursor-not-allowed disabled:text-stone-500 disabled:hover:border-sand-300",
  dark: "inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm text-white bg-stone-900 hover:bg-black transition disabled:cursor-not-allowed disabled:bg-sand-300 disabled:text-stone-500",
  small:
    "inline-flex items-center gap-1 h-8 px-3 rounded-full text-[13px] text-stone-900 bg-sand-50 border border-sand-300 hover:border-stone-300 transition disabled:cursor-not-allowed disabled:text-stone-500 disabled:hover:border-sand-300",
};

/** Initials circle for a guest. */
export function Avatar({ name }: { name: string }) {
  const ini = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "?";
  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ember-100 text-[13px] font-medium text-ember-700">
      {ini}
    </span>
  );
}

/** Outer wrapper for a page that draws its own layout. Tells the shell to drop its default title and sheet. */
export function OwnLayout({ children }: { children: ReactNode }) {
  return <div className="own-layout">{children}</div>;
}

/** Glass pill switch on the photo, e.g. Cricklewood | Streatham Hill. Uses links so each side has its own URL. */
export function PillSwitch({ items, current, label = "Switch" }: { items: { href: string; label: string }[]; current: string; label?: string }) {
  return (
    <div className="inline-flex rounded-full border border-white/15 bg-[rgba(58,52,48,0.48)] p-1 backdrop-blur-xl" role="group" aria-label={label}>
      {items.map((s) => {
        const on = current === s.href.split("?")[0];
        return (
          <a
            key={s.href}
            href={s.href}
            aria-current={on ? "page" : undefined}
            className={`inline-flex h-9 items-center rounded-full px-4 text-sm whitespace-nowrap transition ${on ? "bg-sand-50 text-stone-900" : "text-white/90 hover:text-white"}`}
          >
            {s.label}
          </a>
        );
      })}
    </div>
  );
}

/** Segmented control on a white sheet. */
export function Seg<T extends string>({ options, value, onChange, label }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="inline-flex flex-wrap gap-0.5 rounded-full bg-sand-200 p-1" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`h-8 rounded-full px-3.5 text-[13px] whitespace-nowrap transition ${value === o.value ? "bg-sand-50 text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Inputs on white sheets. */
export const field =
  "h-11 w-full rounded-full border border-sand-300 bg-sand-100 px-4 text-sm text-stone-900 placeholder:text-stone-500 outline-none transition focus:border-stone-500 focus:bg-sand-50 [color-scheme:light]";
export const fieldArea =
  "w-full rounded-[18px] border border-sand-300 bg-sand-100 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-500 outline-none transition focus:border-stone-500 focus:bg-sand-50";

/** Small grey stat tile inside a white sheet. `hot` = the one number that matters most (solid gold). */
export function StatTile({ label, value, hot = false }: { label: string; value: ReactNode; hot?: boolean }) {
  return (
    <div className={`rounded-[18px] p-3.5 ${hot ? "bg-honey-300 text-ink-900" : "bg-sand-200"}`}>
      <div className={`text-xs font-light whitespace-nowrap ${hot ? "" : "text-stone-500"}`}>{label}</div>
      <div className="mt-1 text-[22px]">{value}</div>
    </div>
  );
}

/** Footer bar at the bottom of a sheet (paging, summary, a main action). */
export function SheetFooter({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 border-t border-sand-200 px-4 py-3 text-[13px] md:px-5">{children}</div>;
}

/** Empty state inside a sheet. */
export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-12 text-center text-sm font-light text-stone-500">{children}</p>;
}

/** Table look shared by every list. Wrap the <table> in <div className={tableWrap}> so it scrolls on small screens. */
export const tableWrap = "overflow-x-auto";
export const table = "w-full border-collapse text-sm [&_th]:whitespace-nowrap [&_th]:px-3.5 [&_th]:pb-2.5 [&_th]:pt-1 [&_th]:text-left [&_th]:text-xs [&_th]:font-normal [&_th]:text-stone-500 [&_td]:border-t [&_td]:border-sand-200 [&_td]:px-3.5 [&_td]:py-3 [&_td]:align-middle";

/**
 * Panel that slides up from the bottom on phones and iPad portrait (hidden from lg up).
 * Closes on the backdrop, the X, Escape, or a swipe down on the handle area.
 */
export function BottomSheet({ open, onClose, title, subtitle, children }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode }) {
  // Stay on screen for a moment after closing so it can slide back down.
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const t = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, 260);
    return () => clearTimeout(t);
  }, [open, mounted]);
  return mounted ? (
    <BottomSheetInner onClose={onClose} title={title} subtitle={subtitle} closing={closing}>
      {children}
    </BottomSheetInner>
  ) : null;
}

function BottomSheetInner({ onClose, title, subtitle, children, closing }: { onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; closing: boolean }) {
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : "Details"}>
      <div className={`${closing ? "sheet-fade-out" : "sheet-fade"} absolute inset-0 bg-black/65 backdrop-blur-[2px]`} onClick={onClose} />
      <div
        className={`${closing ? "sheet-down" : "sheet-up"} absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-[28px] bg-sand-100 text-stone-900 shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.5)]`}
        style={drag ? { transform: `translateY(${drag}px)`, transition: "none" } : undefined}
      >
        <div
          className="shrink-0 touch-none px-5 pb-3 pt-2.5"
          onTouchStart={(e) => (start.current = e.touches[0].clientY)}
          onTouchMove={(e) => start.current !== null && setDrag(Math.max(0, e.touches[0].clientY - start.current))}
          onTouchEnd={() => {
            if (drag > 90) onClose();
            setDrag(0);
            start.current = null;
          }}
        >
          <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-stone-300" aria-hidden="true" />
          <div className="flex items-start gap-3">
            <div className="min-w-0">
              <h2 className="font-outfit text-xl font-normal tracking-tight">{title}</h2>
              {subtitle && <p className="mt-0.5 text-[13px] font-light text-stone-500">{subtitle}</p>}
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand-50 text-stone-600 shadow-sm">
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}

/**
 * Guard for actions that wipe a lot at once (reset a day, clear all reservations).
 * `const [askToType, typeDialog] = useTypedConfirm();` then
 * `if (!(await askToType({ title, message }))) return;` and render `{typeDialog}` once in the page.
 * The red button only works after typing the word (RESET by default).
 */
export function useTypedConfirm(): [(o: { title: string; message: ReactNode; word?: string; action?: string }) => Promise<boolean>, ReactNode] {
  const [req, setReq] = useState<{ title: string; message: ReactNode; word: string; action: string; resolve: (ok: boolean) => void } | null>(null);
  const [typed, setTyped] = useState("");

  const ask = (o: { title: string; message: ReactNode; word?: string; action?: string }) =>
    new Promise<boolean>((resolve) => {
      setTyped("");
      setReq({ title: o.title, message: o.message, word: o.word || "RESET", action: o.action || "Delete", resolve });
    });

  const close = (ok: boolean) => {
    req?.resolve(ok);
    setReq(null);
  };

  const dialog = req ? (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/65 p-3 backdrop-blur-[2px] sm:items-center" role="alertdialog" aria-modal="true" aria-label={req.title} onClick={() => close(false)}>
      <div className="sheet-up w-full max-w-md rounded-[24px] bg-sand-50 p-6 text-stone-900" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-outfit text-xl font-normal">{req.title}</h2>
        <div className="mt-2 text-sm font-light text-stone-600">{req.message}</div>
        <p className="mt-2 text-sm font-light text-red-700">This can&apos;t be undone.</p>
        <label className="mt-4 block text-[13px] text-stone-500">
          Type <b className="font-medium text-stone-900">{req.word}</b> to confirm
          <input
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && typed.trim().toUpperCase() === req.word) close(true);
              if (e.key === "Escape") close(false);
            }}
            autoComplete="off"
            autoCapitalize="characters"
            className={`${field} mt-1.5`}
          />
        </label>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={typed.trim().toUpperCase() !== req.word}
            onClick={() => close(true)}
            className="inline-flex h-11 items-center rounded-full bg-red-600 px-5 text-sm text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {req.action}
          </button>
          <button type="button" onClick={() => close(false)} className={btn.light}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return [ask, dialog];
}

/* ── Date picker ─────────────────────────────────────────────────────────── */

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function londonToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
}
function prettyDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

/**
 * Date picker in the admin style, replacing the browser's own date box.
 * `variant="glass"` sits on the photo (page headers); `variant="light"` sits on a white sheet (forms, filters).
 * Value and onChange use YYYY-MM-DD strings, like <input type="date">.
 */
export function DateField({
  value, onChange, variant = "light", placeholder = "Pick a date", ariaLabel = "Date", allowClear = false, id, className = "", invalid = false,
}: {
  value: string; onChange: (v: string) => void; variant?: "glass" | "light"; placeholder?: string; ariaLabel?: string; allowClear?: boolean; id?: string; className?: string; invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const today = londonToday();
  const base = value || today;
  const [view, setView] = useState(() => ({ y: Number(base.slice(0, 4)), m: Number(base.slice(5, 7)) - 1 }));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const b = value || londonToday();
    setView({ y: Number(b.slice(0, 4)), m: Number(b.slice(5, 7)) - 1 });
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, value]);

  const first = new Date(view.y, view.m, 1);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const monthName = first.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const shift = (n: number) => setView((v) => { const d = new Date(v.y, v.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const pick = (iso: string) => { onChange(iso); setOpen(false); };

  const trigger =
    variant === "glass"
      ? "inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-[rgba(58,52,48,0.48)] px-4 text-[15px] font-light text-white backdrop-blur-xl hover:bg-[rgba(58,52,48,0.65)]"
      : `inline-flex h-11 w-full items-center gap-2 rounded-full border bg-sand-100 px-4 text-sm text-stone-900 hover:border-stone-300 ${invalid ? "border-red-300" : "border-sand-300"}`;

  return (
    <div ref={ref} className={`relative ${variant === "light" ? "w-full" : "inline-block"} ${className}`}>
      <button id={id} type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="dialog" aria-expanded={open} aria-label={`${ariaLabel}: ${value ? prettyDay(value) : "none"}`} className={trigger}>
        <CalendarDays className="h-[18px] w-[18px] shrink-0 opacity-80" strokeWidth={1.6} />
        <span className={`whitespace-nowrap ${value ? "" : variant === "glass" ? "text-white/70" : "text-stone-500"}`}>{value ? prettyDay(value) : placeholder}</span>
        <ChevronDown className={`ml-auto h-4 w-4 shrink-0 opacity-70 transition ${open ? "rotate-180" : ""}`} strokeWidth={1.75} />
      </button>

      {open && (
        <div role="dialog" aria-label={ariaLabel} className={`absolute ${variant === "glass" ? "right-0" : "left-0"} top-[calc(100%+8px)] z-[55] w-[300px] max-w-[calc(100vw-32px)] rounded-[22px] bg-sand-50 p-3.5 text-stone-900 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.55)] ring-1 ring-stone-100`}>
          <div className="mb-2 flex items-center gap-1">
            <span className="pl-1.5 font-outfit text-[17px]">{monthName}</span>
            <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="ml-auto flex h-9 w-9 items-center justify-center rounded-full hover:bg-sand-200">
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <button type="button" onClick={() => shift(1)} aria-label="Next month" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-sand-200">
              <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((w) => (
              <span key={w} className="pb-1 text-[11px] text-stone-500">{w}</span>
            ))}
            {cells.map((d, i) => {
              if (d === null) return <span key={`e${i}`} />;
              const iso = isoDate(view.y, view.m, d);
              const sel = iso === value;
              const isToday = iso === today;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => pick(iso)}
                  aria-pressed={sel}
                  className={`flex h-9 items-center justify-center rounded-full text-sm transition ${
                    sel ? "bg-stone-900 font-medium text-white" : isToday ? "ring-1 ring-inset ring-stone-900 hover:bg-sand-200" : "hover:bg-sand-200"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <div className="mt-2.5 flex items-center gap-2 border-t border-sand-200 pt-2.5">
            <button type="button" onClick={() => pick(today)} className={btn.small}>Today</button>
            {allowClear && value && (
              <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="ml-auto h-8 rounded-full px-3 text-[13px] text-stone-500 hover:text-stone-900">
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
