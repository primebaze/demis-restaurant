"use client";

import { useState, useRef, useEffect } from "react";

const NUMBERS = [
  { label: "Cricklewood", display: "020 3904 6977", tel: "02039046977" },
  { label: "Streatham Hill", display: "020 8213 6357", tel: "02082136357" },
];

/** "Call Us" button that opens a branch picker so the caller chooses which number. */
export function CallButton({ className = "", label = "Call Us" }: { className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen((o) => !o)} className={className} aria-expanded={open} aria-haspopup="menu">
        {label}
      </button>
      {open && (
        <div role="menu" className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-60 rounded-xl border border-stone-200 bg-white shadow-xl overflow-hidden z-30">
          <p className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-widest text-stone-400">Which branch?</p>
          {NUMBERS.map((n) => (
            <a
              key={n.tel}
              href={`tel:${n.tel}`}
              className="flex items-center justify-between px-4 py-3 text-sm hover:bg-stone-100 transition"
            >
              <span className="font-semibold text-stone-800">{n.label}</span>
              <span className="text-stone-500">{n.display}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
