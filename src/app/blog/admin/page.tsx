"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Stats = {
  totalPosts: number;
  published: number;
  drafts: number;
  pendingComments: number;
  recentPosts: { slug: string; title: string; status: string; createdAt: string }[];
};

export default function BlogDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    async function load() {
      const [postsRes, commentsRes] = await Promise.all([
        fetch("/api/blog/admin/posts?page=1"),
        fetch("/api/blog/admin/comments?status=pending"),
      ]);
      const postsData = await postsRes.json();
      const commentsData = await commentsRes.json();

      const allPostsRes = await fetch("/api/blog/admin/posts?status=published&page=1");
      const pubData = await allPostsRes.json();

      setStats({
        totalPosts: postsData.total || 0,
        published: pubData.total || 0,
        drafts: (postsData.total || 0) - (pubData.total || 0),
        pendingComments: commentsData.total || 0,
        recentPosts: (postsData.posts || []).slice(0, 5),
      });
    }
    load();
  }, []);

  if (!stats) {
    return <div className="text-gray-400">Loading dashboard...</div>;
  }

  const statCards = [
    { label: "Total Posts", value: stats.totalPosts, color: "text-blue-400" },
    { label: "Published", value: stats.published, color: "text-emerald-400" },
    { label: "Drafts", value: stats.drafts, color: "text-amber-400" },
    { label: "Pending Comments", value: stats.pendingComments, color: "text-red-400" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Blog Dashboard</h1>
        <Link
          href="/blog/admin/posts/new"
          className="px-4 py-2 bg-gold-300 text-black font-semibold rounded-xl text-sm hover:bg-gold-400 transition"
        >
          New Post
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Recent Posts</h2>
        </div>
        {stats.recentPosts.length === 0 ? (
          <p className="p-6 text-gray-500 text-sm">No posts yet. Create your first post!</p>
        ) : (
          <div className="divide-y divide-gray-800">
            {stats.recentPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/admin/posts/${post.slug}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition"
              >
                <div>
                  <p className="text-white font-medium">{post.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(post.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    post.status === "published"
                      ? "bg-emerald-900/30 text-emerald-400"
                      : "bg-amber-900/30 text-amber-400"
                  }`}
                >
                  {post.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
