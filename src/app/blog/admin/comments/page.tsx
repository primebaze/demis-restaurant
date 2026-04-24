"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Comment = {
  id: string;
  name: string;
  email: string;
  content: string;
  status: string;
  createdAt: string;
  post: { title: string; slug: string };
};

export default function CommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ status: statusFilter, page: String(page) });
    const res = await fetch(`/api/blog/admin/comments?${params}`);
    const data = await res.json();
    setComments(data.comments || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  async function handleAction(id: string, status: "approved" | "rejected") {
    await fetch("/api/blog/admin/comments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    fetchComments();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Comments ({total})</h1>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 bg-[#1a1a1a] border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-gold-400">
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
      </div>

      <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <p className="p-6 text-gray-500 text-sm">Loading...</p>
        ) : comments.length === 0 ? (
          <p className="p-6 text-gray-500 text-sm">No {statusFilter} comments.</p>
        ) : (
          <div className="divide-y divide-gray-800">
            {comments.map((c) => (
              <div key={c.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium text-sm">{c.name}</span>
                      <span className="text-xs text-gray-600">{c.email}</span>
                    </div>
                    <p className="text-gray-300 text-sm mb-2">{c.content}</p>
                    <div className="flex items-center gap-3">
                      <Link href={`/blog/${c.post.slug}`} className="text-xs text-gold-300 hover:text-gold-400">
                        {c.post.title}
                      </Link>
                      <span className="text-xs text-gray-600">
                        {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.status === "pending" && (
                      <>
                        <button onClick={() => handleAction(c.id, "approved")}
                          className="px-3 py-1.5 text-xs bg-emerald-900/30 text-emerald-400 rounded-lg hover:bg-emerald-900/50 transition">
                          Approve
                        </button>
                        <button onClick={() => handleAction(c.id, "rejected")}
                          className="px-3 py-1.5 text-xs bg-red-900/30 text-red-400 rounded-lg hover:bg-red-900/50 transition">
                          Reject
                        </button>
                      </>
                    )}
                    {c.status !== "pending" && (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        c.status === "approved" ? "bg-emerald-900/30 text-emerald-400" : "bg-red-900/30 text-red-400"
                      }`}>
                        {c.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
            className="px-4 py-2 text-sm text-gray-400 bg-[#1a1a1a] border border-gray-800 rounded-xl disabled:opacity-30">
            Previous
          </button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="px-4 py-2 text-sm text-gray-400 bg-[#1a1a1a] border border-gray-800 rounded-xl disabled:opacity-30">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
