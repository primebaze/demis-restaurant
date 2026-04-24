"use client";

import { useState } from "react";

export function CommentForm({ postSlug }: { postSlug: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/blog/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postSlug, name, email, content }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to submit");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setName("");
      setEmail("");
      setContent("");
    } catch {
      setError("Something went wrong");
    }
    setSubmitting(false);
  }

  if (success) {
    return (
      <div className="p-6 bg-emerald-900/20 border border-emerald-800/30 rounded-xl">
        <p className="text-emerald-400 font-medium">Thank you for your comment!</p>
        <p className="text-sm text-stone-400 mt-1">It will appear once approved.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Leave a Comment</h3>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-300 text-sm">{error}</div>
      )}

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Your name"
          className="px-4 py-3 bg-[#0f0f0f] border border-white/10 rounded-xl text-white placeholder-stone-500 text-sm focus:outline-none focus:border-gold-400"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Your email (not displayed)"
          className="px-4 py-3 bg-[#0f0f0f] border border-white/10 rounded-xl text-white placeholder-stone-500 text-sm focus:outline-none focus:border-gold-400"
        />
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
        rows={4}
        maxLength={2000}
        placeholder="Share your thoughts..."
        className="w-full px-4 py-3 bg-[#0f0f0f] border border-white/10 rounded-xl text-white placeholder-stone-500 text-sm focus:outline-none focus:border-gold-400 resize-y mb-4"
      />
      <button
        type="submit"
        disabled={submitting || !name.trim() || !content.trim()}
        className="px-6 py-2.5 bg-gold-300 text-black font-semibold rounded-xl text-sm hover:bg-gold-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Submitting..." : "Post Comment"}
      </button>
    </form>
  );
}
