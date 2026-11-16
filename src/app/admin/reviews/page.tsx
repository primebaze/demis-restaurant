"use client";

import { useEffect, useState, useCallback } from "react";

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
          className={`${i <= n ? "text-gold-700" : "text-stone-400"} ${onChange ? "cursor-pointer" : "cursor-default"}`}
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

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-stone-500 mt-0.5">Write reviews to show on the Sunday buffet page.</p>
      </div>

      {/* New review */}
      <div className="bg-white border border-stone-100 rounded-2xl p-5 mb-8">
        <h2 className="text-sm font-semibold text-stone-900 mb-4">New review</h2>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <input value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={80} placeholder="Reviewer name" className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 text-sm focus:outline-none focus:border-gold-400" />
          <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={80} placeholder="Location (optional, e.g. Streatham Hill)" className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 text-sm focus:outline-none focus:border-gold-400" />
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-stone-500">Rating:</span>
          <Stars n={rating} onChange={setRating} />
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={3} placeholder="The review…" className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 text-sm focus:outline-none focus:border-gold-400 resize-y mb-1" />
        <p className="text-[11px] text-stone-400 mb-3">{text.length}/1000</p>
        {error && <p className="text-xs text-red-700 mb-3">{error}</p>}
        <button onClick={create} disabled={saving} className="px-4 py-2 bg-gold-300 text-black font-semibold rounded-lg text-sm hover:bg-gold-400 transition disabled:opacity-40">
          {saving ? "Saving…" : "Add review"}
        </button>
      </div>

      {/* Existing */}
      {loading ? (
        <p className="text-stone-500 text-sm">Loading…</p>
      ) : reviews.length === 0 ? (
        <p className="text-stone-500 text-sm">No reviews yet.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white border border-stone-100 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-stone-900">{r.author}</span>
                    <Stars n={r.rating} />
                    {r.location && <span className="text-xs text-stone-500">· {r.location}</span>}
                  </div>
                  <p className="text-sm text-stone-500 mt-1 whitespace-pre-wrap break-words">{r.body}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => toggle(r)} className={`text-xs px-2.5 py-1 rounded-full font-medium ${r.active ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
                    {r.active ? "Live" : "Hidden"}
                  </button>
                  <button onClick={() => remove(r)} className="text-xs text-red-700 hover:text-red-700">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
