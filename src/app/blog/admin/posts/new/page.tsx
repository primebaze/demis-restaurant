"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Category = { id: string; name: string };

export default function NewPostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/blog/admin/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []));
  }, []);

  function autoSlug(t: string) {
    setSlug(
      t.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
    );
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/blog/admin/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) setFeaturedImage(data.url);
      else setError(data.error || "Upload failed");
    } catch {
      setError("Upload failed");
    }
    setUploading(false);
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/blog/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug, excerpt, content, featuredImage, categoryId, metaTitle, metaDescription, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
        setSaving(false);
        return;
      }
      router.push("/blog/admin/posts");
    } catch {
      setError("Failed to save");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-white mb-6">New Post</h1>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-300 text-sm">{error}</div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); autoSlug(e.target.value); }}
            className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gold-400"
            placeholder="Post title"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Slug</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gold-400"
            placeholder="post-url-slug"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-xl text-white focus:outline-none focus:border-gold-400"
            >
              <option value="">No category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-xl text-white focus:outline-none focus:border-gold-400"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Featured Image</label>
          <div className="flex items-center gap-4">
            <label className="px-4 py-2 bg-[#1a1a1a] border border-gray-700 rounded-xl text-sm text-gray-300 cursor-pointer hover:border-gold-400 transition">
              {uploading ? "Uploading..." : "Choose Image"}
              <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
            </label>
            {featuredImage && (
              <div className="flex items-center gap-2">
                <img src={featuredImage} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
                <button onClick={() => setFeaturedImage("")} className="text-xs text-red-400 hover:text-red-300">Remove</button>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Excerpt</label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gold-400 resize-y"
            placeholder="Brief description for search results and social sharing"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Content (HTML)</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={16}
            className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gold-400 resize-y font-mono text-sm"
            placeholder="<p>Write your blog post content here...</p>"
          />
        </div>

        <div className="border-t border-gray-800 pt-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">SEO Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Meta Title</label>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gold-400"
                placeholder="Custom title for search engines (leave blank to use post title)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Meta Description</label>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gold-400 resize-y"
                placeholder="Custom description for search engines (leave blank to use excerpt)"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="px-6 py-3 bg-gold-300 text-black font-semibold rounded-xl hover:bg-gold-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : status === "published" ? "Publish" : "Save Draft"}
          </button>
          <button
            onClick={() => router.push("/blog/admin/posts")}
            className="px-6 py-3 bg-[#1a1a1a] border border-gray-700 text-gray-300 rounded-xl hover:bg-white/5 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
