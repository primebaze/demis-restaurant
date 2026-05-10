"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { RichTextEditor } from "@/components/RichTextEditor";

type Category = { id: string; name: string };
type Author = { id: string; name: string };

export default function EditPostPage() {
  const router = useRouter();
  const { id } = useParams();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [authorId, setAuthorId] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [categories, setCategories] = useState<Category[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/blog/admin/posts/${id}`).then((r) => r.json()),
      fetch("/api/blog/admin/categories").then((r) => r.json()),
      fetch("/api/blog/admin/authors").then((r) => r.json()),
    ]).then(([postData, catData, authorData]) => {
      const p = postData.post;
      if (p) {
        setTitle(p.title);
        setSlug(p.slug);
        setExcerpt(p.excerpt || "");
        setContent(p.content || "");
        setFeaturedImage(p.featuredImage || "");
        setCategoryId(p.categoryId || "");
        setAuthorId(p.author?.id || "");
        setMetaTitle(p.metaTitle || "");
        setMetaDescription(p.metaDescription || "");
        setStatus(p.status);
      }
      setCategories(catData.categories || []);
      setAuthors(authorData.authors || []);
      setLoaded(true);
    });
  }, [id]);

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
      const res = await fetch(`/api/blog/admin/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug, excerpt, content, featuredImage, categoryId, authorId, metaTitle, metaDescription, status }),
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

  if (!loaded) return <div className="text-gray-400">Loading post...</div>;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-white mb-6">Edit Post</h1>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-300 text-sm">{error}</div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-xl text-white focus:outline-none focus:border-gold-400" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Slug</label>
          <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)}
            className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-xl text-white focus:outline-none focus:border-gold-400" />
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Author</label>
            <select value={authorId} onChange={(e) => setAuthorId(e.target.value)}
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-xl text-white focus:outline-none focus:border-gold-400">
              {authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-xl text-white focus:outline-none focus:border-gold-400">
              <option value="">No category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-xl text-white focus:outline-none focus:border-gold-400">
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
          <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2}
            className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gold-400 resize-y" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Content</label>
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Start writing your blog post..."
          />
        </div>

        <div className="border-t border-gray-800 pt-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">SEO Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Meta Title</label>
              <input type="text" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-xl text-white focus:outline-none focus:border-gold-400"
                placeholder="Leave blank to use post title" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Meta Description</label>
              <textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} rows={2}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-xl text-white focus:outline-none focus:border-gold-400 resize-y"
                placeholder="Leave blank to use excerpt" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button onClick={handleSave} disabled={saving || !title.trim()}
            className="px-6 py-3 bg-gold-300 text-black font-semibold rounded-xl hover:bg-gold-400 transition disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button onClick={() => router.push("/blog/admin/posts")}
            className="px-6 py-3 bg-[#1a1a1a] border border-gray-700 text-gray-300 rounded-xl hover:bg-white/5 transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
