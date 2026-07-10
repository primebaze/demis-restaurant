"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type Msg = { id: number; from: "bot" | "user"; node: React.ReactNode };

// Canned FAQ. Answers are authored here (not user input), so there's nothing
// unsafe to render — plain text and known links only.
const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "How does the Sunday buffet work?",
    a: (
      <>
        All-you-can-eat every Sunday, 12:30pm to 4:00pm. The earlier you arrive, the less you pay: first 20 people £20, next 25 £25, then £30, paid at the door.{" "}
        <Link href="/sunday-buffet" className="text-gold-300 underline">Reserve a spot</Link> to guarantee your table.
      </>
    ),
  },
  {
    q: "How much is it?",
    a: "It depends when you arrive: £20 for the first 20 guests, £25 for the next 25, then £30 after. Paid at the door.",
  },
  {
    q: "What time & where?",
    a: "Sundays, 12:30pm to 4:00pm (the buffet ends at 4pm) at our Streatham Hill branch, 67 Streatham Hill, London SW2 4TX.",
  },
  {
    q: "Do I need to book?",
    a: (
      <>
        Walk-ins are welcome, but reserving on the{" "}
        <Link href="/sunday-buffet" className="text-gold-300 underline">Sunday Buffet page</Link> guarantees your spot. Your price depends on how early you arrive, not when you book.
      </>
    ),
  },
  {
    q: "Book a table",
    a: (
      <>
        Reserve any time on our <Link href="/booking" className="text-gold-300 underline">booking page</Link>.
      </>
    ),
  },
  {
    q: "Where are you?",
    a: "Cricklewood: 89 Cricklewood Broadway, NW2 3JG. Streatham Hill: 67 Streatham Hill, SW2 4TX.",
  },
  {
    q: "Talk to a person",
    a: (
      <>
        Call <a href="tel:+442039046977" className="text-gold-300 underline">020 3904 6977</a>, email{" "}
        <a href="mailto:bookings@demisrestaurant.co.uk" className="text-gold-300 underline">bookings@demisrestaurant.co.uk</a>, or DM us on{" "}
        <a href="https://www.instagram.com/demisrestaurant/" target="_blank" rel="noopener noreferrer" className="text-gold-300 underline">Instagram</a>.
      </>
    ),
  },
];

export function LiveChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, from: "bot", node: "Hi! 👋 I'm Demi's helper. Tap a question below and I'll answer right away." }]);
  const idRef = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  function ask(q: string, a: React.ReactNode) {
    setMsgs((m) => [
      ...m,
      { id: idRef.current++, from: "user", node: q },
      { id: idRef.current++, from: "bot", node: a },
    ]);
  }

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Demi's helper chat"
          className="fixed bottom-24 right-4 sm:right-6 z-40 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-[#141210] shadow-[0_24px_70px_-20px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col"
          style={{ maxHeight: "70vh" }}
        >
          <div className="flex items-center justify-between px-4 py-3 bg-[#1c1a16] border-b border-white/10">
            <div>
              <p className="text-sm font-semibold text-white">Demi&apos;s Helper</p>
              <p className="text-[11px] text-gold-300/70">Quick answers</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="text-stone-400 hover:text-white text-lg leading-none">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgs.map((m) => (
              <div key={m.id} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${m.from === "user" ? "bg-gold-300 text-black" : "bg-white/[0.06] text-stone-200"}`}>
                  {m.node}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="p-3 border-t border-white/10 flex flex-wrap gap-2">
            {FAQS.map((f) => (
              <button
                key={f.q}
                onClick={() => ask(f.q, f.a)}
                className="text-xs px-3 py-1.5 rounded-full border border-white/15 bg-white/[0.04] text-stone-200 hover:border-gold-300/50 hover:text-white hover:bg-white/[0.08] transition"
              >
                {f.q}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chat"}
        className="fixed bottom-6 right-4 sm:right-6 z-40 w-14 h-14 rounded-full bg-gold-300 text-black shadow-xl flex items-center justify-center hover:bg-gold-400 transition"
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-6 h-6"><path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 3C6.9 3 3 6.5 3 10.8c0 2.2 1 4.2 2.7 5.6-.1 1-.5 2.2-1.4 3.3-.2.2 0 .6.3.5 1.8-.3 3.2-1 4.1-1.6.9.3 2 .5 3.3.5 5.1 0 9-3.5 9-7.8S17.1 3 12 3Z" /></svg>
        )}
      </button>
    </>
  );
}
