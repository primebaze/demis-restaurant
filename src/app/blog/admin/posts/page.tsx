"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Post = {
  id: string;
  title: string;
  slug: string;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  views: number;
  author: { name: string };
  category: { name: string; slug: string } | null;
};

export default function BlogPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);

    const res = await fetch(`/api/blog/admin/posts?${params}`);
    const data = await res.json();
    setPosts(data.posts || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  }, [page, search, statusFilter]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    await fetch(`/api/blog/admin/posts/${id}`, { method: "DELETE" });
    fetchPosts();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Posts ({total})</h1>
        <Link
          href="/blog/admin/posts/new"
          className="px-4 py-2 bg-gold-300 text-black font-semibold rounded-xl text-sm hover:bg-gold-400 transition"
        >
          New Post
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search posts..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 px-4 py-2.5 bg-[#1a1a1a] border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gold-400"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 bg-[#1a1a1a] border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-gold-400"
        >
          <option value="">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <p className="p-6 text-gray-500 text-sm">Loading...</p>
        ) : posts.length === 0 ? (
          <p className="p-6 text-gray-500 text-sm">No posts found.</p>
        ) : (
          <div className="divide-y divide-gray-800">
            {posts.map((post) => (
              <div key={post.id} className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition">
                <div className="min-w-0 flex-1">
                  <Link href={`/blog/admin/posts/${post.id}`} className="text-white font-medium hover:text-gold-300 transition">
                    {post.title}
                  </Link>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500">{post.author.name}</span>
                    {post.category && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400">{post.category.name}</span>
                    )}
                    <span className="text-xs text-gray-600">
                      {new Date(post.publishedAt || post.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <span className="text-xs text-gray-500">{post.views.toLocaleString("en-GB")} views</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      post.status === "published"
                        ? "bg-emerald-900/30 text-emerald-400"
                        : "bg-amber-900/30 text-amber-400"
                    }`}
                  >
                    {post.status}
                  </span>
                  <button
                    onClick={() => handleDelete(post.id, post.title)}
                    className="text-xs text-red-400 hover:text-red-300 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 text-sm text-gray-400 bg-[#1a1a1a] border border-gray-800 rounded-xl disabled:opacity-30"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 text-sm text-gray-400 bg-[#1a1a1a] border border-gray-800 rounded-xl disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
