"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";

export type EmailTemplate = { key: string; name: string; subject: string; body: string };

/**
 * Ready-written emails as tap-to-use chips, plus "Save current" so the admin can
 * keep their own. Fetches the saved emails for one screen (`scope`) itself, so any
 * composer can drop it in. Picking one fills the subject and message; nothing sends
 * until the admin presses Send.
 */
export default function EmailSuggestions({
  scope,
  subject,
  message,
  onPick,
  label = "Start from a suggestion",
  className = "",
}: {
  scope: "guest" | "feast" | "buffet" | "bookings" | "blast";
  subject: string;
  message: string;
  onPick: (t: EmailTemplate) => void;
  label?: string;
  className?: string;
}) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [picked, setPicked] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/mailing/templates?scope=${scope}`).catch(() => null);
    if (!res?.ok) return;
    const data = await res.json();
    setTemplates(data.templates || []);
  }, [scope]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    const name = window.prompt("Save this email as:", "")?.trim();
    if (!name) return;
    const res = await fetch("/api/admin/mailing/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, subject, body: message, scope }),
    });
    if (!res.ok) return setNote("Could not save that one.");
    await load();
    setNote(`Saved as "${name}".`);
  }

  return (
    <div className={className}>
      <p className="text-xs text-stone-500">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {templates.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setPicked(t.key);
              setNote("");
              onPick(t);
            }}
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
          onClick={save}
          disabled={!subject.trim() || !message.trim()}
          className="inline-flex h-8 items-center gap-1 rounded-full border border-sand-300 bg-sand-50 px-3 text-[13px] text-stone-900 transition hover:border-stone-300 disabled:cursor-not-allowed disabled:text-stone-500"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
          Save current
        </button>
      </div>
      {note && <p className="mt-1.5 text-xs text-stone-500" role="status">{note}</p>}
    </div>
  );
}
