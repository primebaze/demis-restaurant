/**
 * Building blocks for the redesigned admin (Nov 2026): a big light page title
 * over the dining room photo, a frosted stat strip, and white "sheets" for the
 * content. See docs/COLOURS.md, "Admin".
 */
import type { ReactNode } from "react";

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
    <section aria-label={label} className={`rounded-[22px] bg-white text-stone-900 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.6)] ${className}`}>
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
  ok: "bg-emerald-50 text-emerald-700",
  wait: "bg-amber-50 text-amber-800",
  bad: "bg-red-50 text-red-700",
  off: "bg-stone-100 text-stone-500",
  hot: "bg-gold-100 text-gold-800",
  gold: "bg-gold-100 text-gold-800",
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
    "inline-flex items-center gap-2 h-11 px-5 rounded-full text-[15px] font-medium text-ink-900 bg-gold-300 hover:bg-gold-200 transition disabled:opacity-50",
  light:
    "inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm text-stone-900 bg-white border border-stone-200 hover:border-stone-300 transition disabled:opacity-50",
  dark: "inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm text-white bg-stone-900 hover:bg-black transition disabled:opacity-50",
  small:
    "inline-flex items-center gap-1 h-8 px-3 rounded-full text-[13px] text-stone-900 bg-white border border-stone-200 hover:border-stone-300 transition disabled:opacity-50",
};

/** Initials circle for a guest. */
export function Avatar({ name }: { name: string }) {
  const ini = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "?";
  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-100 text-[13px] font-medium text-gold-800">
      {ini}
    </span>
  );
}
