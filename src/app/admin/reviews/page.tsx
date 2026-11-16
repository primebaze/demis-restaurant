"use client";

import { useEffect, useState, useCallback } from "react";
import { Trash2 } from "lucide-react";
import { Avatar, Empty, GlassStats, OwnLayout, PageHead, Sheet, SheetTitle, btn, field, fieldArea } from "@/components/admin/ui";

type Review = {
  id: string;
  author: string;
  rating: number;
  body: string;
  location: string;
  active: boolean;
  createdAt: string;
};

function Stars({ n, onChange }: { n: number; onChange?: (v: number) => void }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange?.(i)}
          className={`${i <= n ? "text-stone-900" : "text-stone-300"} ${onChange ? "cursor-pointer text-xl leading-none" : "cursor-default"}`}
          aria-label={`${i} star`}
        >
          ★
        </button>
      ))}
    </span>
  );
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const [author, setAuthor] = useState("");
  const [location, setLocation] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/reviews");
    const d = await res.json();
    setReviews(d.reviews || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  async function create() {
    if (!author.trim() || !text.trim()) { setError("Add a name and the review text"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author, location, rating, body: text }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Could not save"); return; }
      setAuthor(""); setLocation(""); setRating(5); setText("");
      await fetchReviews();
    } finally { setSaving(false); }
  }

  async function toggle(r: Review) {
    await fetch(`/api/admin/reviews/${r.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !r.active }),
    });
    fetchReviews();
  }

  async function remove(r: Review) {
    if (!confirm("Delete this review?")) return;
    await fetch(`/api/admin/reviews/${r.id}`, { method: "DELETE" });
    fetchReviews();
  }

  const live = reviews.filter((r) => r.active).length;
  const average = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "0";

  return (
    <OwnLayout>
      <PageHead title="Reviews" subtitle="Write reviews to show on the Sunday buffet page." />

      <GlassStats
        items={[
          { label: "Reviews", value: loading ? "…" : reviews.length },
          { label: "Live", value: loading ? "…" : live, hint: "shown on the page" },
          { label: "Hidden", value: loading ? "…" : reviews.length - live },
          { label: "Average rating", value: loading ? "…" : average, hint: "out of 5" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start">
        {/* New review */}
        <Sheet label="New review" className="p-4 md:p-5">
          <SheetTitle>New review</SheetTitle>
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1.5 ml-1 block text-xs text-stone-500">Reviewer name</span>
              <input value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={80} placeholder="Reviewer name" className={field} />
            </label>
            <label className="block">
              <span className="mb-1.5 ml-1 block text-xs text-stone-500">Location</span>
              <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={80} placeholder="Optional, e.g. Streatham Hill" className={field} />
            </label>
            <div className="flex items-center gap-3 rounded-full bg-sand-100 px-4 py-2">
              <span className="text-xs text-stone-500">Rating</span>
              <Stars n={rating} onChange={setRating} />
            </div>
            <div>
              <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={5} placeholder="The review…" aria-label="Review text" className={`${fieldArea} resize-y`} />
              <p className="mr-1 mt-1 text-right text-[11px] text-stone-500">{text.length}/1000</p>
            </div>
            {error && <p className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
            <button type="button" onClick={create} disabled={saving} className={`${btn.primary} w-full justify-center`}>
              {saving ? "Saving…" : "Add review"}
            </button>
          </div>
        </Sheet>

        {/* Existing */}
        <Sheet label="All reviews" className="overflow-hidden">
          <div className="px-4 pb-3 pt-4 md:px-5">
            <SheetTitle>
              All reviews
              {!loading && <span className="ml-1.5 text-[13px] font-light text-stone-500">{reviews.length}</span>}
            </SheetTitle>
          </div>
          {loading ? (
            <Empty>Loading…</Empty>
          ) : reviews.length === 0 ? (
            <Empty>No reviews yet.</Empty>
          ) : (
            <ul>
              {reviews.map((r) => (
                <li key={r.id} className="flex items-start gap-3 border-t border-sand-200 px-4 py-3.5 md:px-5">
                  <Avatar name={r.author} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-[15px] text-stone-900">{r.author}</span>
                      <Stars n={r.rating} />
                      {r.location && <span className="text-xs text-stone-500">· {r.location}</span>}
                    </div>
                    <p className={`mt-1 whitespace-pre-wrap break-words text-sm ${r.active ? "text-stone-600" : "text-stone-500"}`}>{r.body}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggle(r)}
                      aria-pressed={r.active}
                      title={r.active ? "Shown on the page. Click to hide." : "Hidden. Click to show."}
                      className={`inline-flex h-7 items-center rounded-full px-3 text-xs transition ${
                        r.active ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-sand-200 text-stone-500 hover:bg-sand-300"
                      }`}
                    >
                      {r.active ? "Live" : "Hidden"}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(r)}
                      aria-label={`Delete review by ${r.author}`}
                      title="Delete"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-700 transition hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Sheet>
      </div>
    </OwnLayout>
  );
}
