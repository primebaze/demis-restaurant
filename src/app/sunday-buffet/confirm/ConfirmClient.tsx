"use client";

import { useState } from "react";

type Props = { token: string; name: string; prettyDate: string; alreadyConfirmed: boolean };

export function ConfirmClient({ token, name, prettyDate, alreadyConfirmed }: Props) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">(alreadyConfirmed ? "done" : "idle");
  const [msg, setMsg] = useState("");

  async function confirm() {
    setState("sending");
    try {
      const res = await fetch("/api/sunday-buffet/confirm", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const d = await res.json();
      if (!res.ok) { setMsg(d.error || "Something went wrong."); setState("error"); return; }
      setState("done");
    } catch {
      setMsg("Something went wrong. Please try again."); setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-gold-300/15 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="#e3c07a" strokeWidth="2.5" className="w-8 h-8"><path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <p className="text-2xl font-semibold text-white font-[family-name:var(--font-display)]">You&rsquo;re confirmed</p>
        <p className="mt-3 text-stone-400">Thanks{name ? `, ${name}` : ""}! We&rsquo;ve got you down for <span className="text-white">{prettyDate}</span>. See you Sunday.</p>
        <p className="mt-2 text-sm text-stone-500">Doors 12pm · buffet from 12:30pm.</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="text-[11px] uppercase tracking-[0.2em] text-gold-300/70 mb-2">Sunday buffet</p>
      <p className="text-2xl font-semibold text-white font-[family-name:var(--font-display)]">Are you still coming?</p>
      <p className="mt-3 text-stone-400">Hi{name ? ` ${name}` : ""}, please confirm your spot for <span className="text-white">{prettyDate}</span> so we can save your table.</p>
      <button
        onClick={confirm}
        disabled={state === "sending"}
        className="mt-7 w-full px-4 py-4 bg-gold-300 text-black font-semibold rounded-xl hover:bg-gold-400 transition disabled:opacity-50"
      >
        {state === "sending" ? "Confirming…" : "Yes, I'll be there"}
      </button>
      {state === "error" && <p className="mt-3 text-sm text-red-400">{msg}</p>}
      <p className="mt-4 text-xs text-stone-500">Can&rsquo;t make it? Just give us a call and we&rsquo;ll free up your table.</p>
    </div>
  );
}
