"use client";

import { useState, type ReactNode } from "react";
import { Loader2, Plus, Send } from "lucide-react";

/**
 * "Email everyone" for the Sunday Buffet and Sunday Feast pages, laid out as three
 * steps: who gets it, start from a saved email, write it. Behaviour lives in the page;
 * this only draws it.
 */
export default function EmailEveryonePanel({
  className = "",
  dayLabel,
  withEmail,
  allCount,
  scope,
  onScope,
  scopeHelp,
  templates,
  onLoadTemplate,
  onSaveTemplate,
  subject,
  onSubject,
  message,
  onMessage,
  messagePlaceholder,
  messageHint,
  sending,
  onSend,
  onClose,
  note,
}: {
  className?: string;
  dayLabel: string;
  withEmail: number;
  allCount: number | null;
  scope: "day" | "all";
  onScope: (s: "day" | "all") => void;
  scopeHelp: ReactNode;
  templates: { key: string; name: string; subject: string; body: string }[];
  onLoadTemplate: (t: { key: string; name: string; subject: string; body: string }) => void;
  onSaveTemplate: () => void;
  subject: string;
  onSubject: (v: string) => void;
  message: string;
  onMessage: (v: string) => void;
  messagePlaceholder: string;
  messageHint: ReactNode;
  sending: boolean;
  onSend: () => void;
  onClose: () => void;
  note?: string;
}) {
  const [picked, setPicked] = useState("");
  const count = scope === "all" ? allCount : withEmail;
  const step = (n: number, title: string) => (
    <div className="flex items-center gap-2.5 text-[15px] text-stone-900">
      <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-stone-900 text-xs text-white">{n}</span>
      {title}
    </div>
  );
  const option = (value: "day" | "all", label: string, n: number | null, disabled = false) => {
    const on = scope === value;
    return (
      <button
        type="button"
        onClick={() => onScope(value)}
        disabled={disabled}
        aria-pressed={on}
        className={`rounded-2xl border bg-sand-50 px-3.5 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
          on ? "border-transparent shadow-[inset_0_0_0_2px_#1c1917]" : "border-sand-300 hover:border-stone-300"
        }`}
      >
        <span className="block text-[13px] text-stone-600">{label}</span>
        <span className="mt-0.5 block text-xl font-normal text-stone-900">{n ?? "…"}</span>
      </button>
    );
  };

  return (
    <section aria-label="Email everyone" className={`overflow-hidden rounded-[22px] bg-sand-50 text-stone-900 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.6)] ${className}`}>
      <div className="flex items-center border-b border-sand-200 px-5 pb-3.5 pt-5">
        <h2 className="font-outfit text-[22px] font-normal tracking-tight">Email everyone</h2>
        <button type="button" onClick={onClose} className="ml-auto text-sm text-stone-500 transition hover:text-stone-900">
          Close
        </button>
      </div>

      <div className="border-b border-sand-200 px-5 py-4">
        {step(1, "Who gets it")}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {option("day", `Booked for ${dayLabel}`, withEmail, withEmail === 0)}
          {option("all", "All past guests", allCount)}
        </div>
        <p className="mt-2.5 text-xs leading-relaxed text-stone-500">{scopeHelp}</p>
      </div>

      <div className="border-b border-sand-200 px-5 py-4">
        {step(2, "Pick a suggestion or a saved email")}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {templates.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => { setPicked(t.key); onLoadTemplate(t); }}
              aria-pressed={picked === t.key}
              className={`inline-flex h-8 items-center rounded-full border px-3 text-[13px] transition ${
                picked === t.key
                  ? "border-transparent bg-stone-900 text-white"
                  : "border-sand-300 bg-sand-50 text-stone-900 hover:border-stone-300 hover:bg-sand-100"
              }`}
            >
              {t.name}
            </button>
          ))}
          <button
            type="button"
            onClick={onSaveTemplate}
            disabled={!subject.trim() || !message.trim()}
            className="inline-flex h-8 items-center gap-1 rounded-full border border-sand-300 bg-sand-50 px-3 text-[13px] text-stone-900 transition hover:border-stone-300 disabled:cursor-not-allowed disabled:text-stone-500"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
            Save current
          </button>
        </div>
      </div>

      <div className="px-5 py-4">
        {step(3, "Write it")}
        <label className="mt-3 block text-xs text-stone-500" htmlFor="ee-subject">Subject</label>
        <input
          id="ee-subject"
          value={subject}
          onChange={(e) => onSubject(e.target.value)}
          placeholder="e.g. See you this Sunday"
          className="mt-1.5 h-11 w-full rounded-xl border border-sand-300 bg-sand-50 px-3.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-500 focus:border-stone-500"
        />
        <label className="mt-3 block text-xs text-stone-500" htmlFor="ee-message">Message (each guest is greeted by name)</label>
        <textarea
          id="ee-message"
          value={message}
          onChange={(e) => onMessage(e.target.value)}
          rows={7}
          placeholder={messagePlaceholder}
          className="mt-1.5 w-full resize-y rounded-xl border border-sand-300 bg-sand-50 px-3.5 py-3 text-sm leading-relaxed text-stone-900 outline-none transition placeholder:text-stone-500 focus:border-stone-500"
        />
        {messageHint && <p className="mt-1.5 text-xs text-stone-500">{messageHint}</p>}
        {note && <p className="mt-2 text-xs text-stone-600" role="status">{note}</p>}
      </div>

      <div className="flex items-center gap-3 bg-sand-100 px-5 py-3.5">
        <span className="text-[13px] text-stone-500">
          {count ?? "…"} {count === 1 ? "guest" : "guests"}
        </span>
        <button
          type="button"
          onClick={onSend}
          disabled={sending}
          className="ml-auto inline-flex h-11 items-center gap-2 rounded-full bg-honey-300 px-5 text-[15px] font-medium text-ink-900 transition hover:bg-honey-200 disabled:cursor-not-allowed disabled:bg-sand-300 disabled:text-stone-500"
        >
          {sending ? <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={1.75} /> : <Send className="h-[18px] w-[18px]" strokeWidth={1.5} />}
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </section>
  );
}
