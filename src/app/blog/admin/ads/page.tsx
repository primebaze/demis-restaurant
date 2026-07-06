"use client";

import { useEffect, useState, useCallback } from "react";

type Ad = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  active: boolean;
  clicks: number;
  createdAt: string;
};

export default function AdsAdminPage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  // New-ad form
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchAds = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/blog/admin/ads");
    const data = await res.json();
    setAds(data.ads || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/blog/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }
      setImageUrl(data.url);
    } finally {
      setUploading(false);
    }
  }

  async function createAd() {
    if (!imageUrl) {
      setError("Upload an ad image first");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/blog/admin/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, linkUrl, imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save ad");
        return;
      }
      setTitle("");
      setLinkUrl("");
      setImageUrl("");
      await fetchAds();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(ad: Ad) {
    await fetch(`/api/blog/admin/ads/${ad.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !ad.active }),
    });
    fetchAds();
  }

  async function deleteAd(ad: Ad) {
    if (!confirm("Delete this ad?")) return;
    await fetch(`/api/blog/admin/ads/${ad.id}`, { method: "DELETE" });
    fetchAds();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Ads</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Upload banner ads. Active ads rotate automatically on the blog.
        </p>
      </div>

      {/* New ad */}
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-5 mb-8">
        <h2 className="text-sm font-semibold text-white mb-4">New ad</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ad image (wide banner works best)</label>
            {imageUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Ad preview" className="w-full rounded-lg border border-gray-700" />
                <button
                  onClick={() => setImageUrl("")}
                  className="absolute top-2 right-2 px-2 py-1 text-xs bg-black/60 text-white rounded"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center h-32 border border-dashed border-gray-700 rounded-lg cursor-pointer text-sm text-gray-500 hover:border-gold-400 transition">
                {uploading ? "Uploading…" : "Click to upload image"}
                <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
              </label>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Title (optional, for your reference)</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Summer promo"
                className="w-full px-3 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gold-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Link URL (where the ad goes)</label>
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://…"
                className="w-full px-3 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gold-400"
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              onClick={createAd}
              disabled={saving || uploading || !imageUrl}
              className="px-4 py-2 bg-gold-300 text-black font-semibold rounded-lg text-sm hover:bg-gold-400 transition disabled:opacity-40"
            >
              {saving ? "Saving…" : "Add ad"}
            </button>
          </div>
        </div>
      </div>

      {/* Existing ads */}
      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : ads.length === 0 ? (
        <p className="text-gray-500 text-sm">No ads yet.</p>
      ) : (
        <div className="space-y-3">
          {ads.map((ad) => (
            <div
              key={ad.id}
              className="flex items-center gap-4 bg-[#1a1a1a] border border-gray-800 rounded-xl p-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ad.imageUrl} alt={ad.title} className="w-28 h-16 object-cover rounded-lg shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white truncate">{ad.title || "Untitled ad"}</p>
                <p className="text-xs text-gray-500 truncate">{ad.linkUrl || "No link"}</p>
                <p className="text-[11px] text-gray-600 mt-0.5">{ad.clicks} clicks</p>
              </div>
              <button
                onClick={() => toggleActive(ad)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
                  ad.active
                    ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                    : "bg-gray-600/20 text-gray-400 hover:bg-gray-600/30"
                }`}
              >
                {ad.active ? "Active" : "Paused"}
              </button>
              <button
                onClick={() => deleteAd(ad)}
                className="text-xs text-red-400 hover:text-red-300 transition"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
