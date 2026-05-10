"use client";

import { useEffect, useState } from "react";

type Author = {
  id: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  isActive: boolean;
};

export default function AuthorsPage() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [meId, setMeId] = useState<string>("");

  // Add form state
  const [addName, setAddName] = useState("");
  const [addBio, setAddBio] = useState("");
  const [addAvatar, setAddAvatar] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/blog/admin/authors?all=true").then((r) => r.json()),
      fetch("/api/blog/admin/me").then((r) => r.json()),
    ]).then(([authData, meData]) => {
      setAuthors(authData.authors || []);
      setMeId(meData.author?.sub || "");
      setLoading(false);
    });
  }, []);

  async function handleAdd() {
    if (!addName.trim()) return;
    setAddError("");
    setAdding(true);
    try {
      const res = await fetch("/api/blog/admin/authors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName.trim(), bio: addBio.trim() || undefined, avatarUrl: addAvatar.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Failed to create author");
      } else {
        setAuthors((prev) => [...prev, data.author]);
        setAddName("");
        setAddBio("");
        setAddAvatar("");
      }
    } catch {
      setAddError("Failed to create author");
    }
    setAdding(false);
  }

  function startEdit(a: Author) {
    setEditId(a.id);
    setEditName(a.name);
    setEditBio(a.bio || "");
    setEditAvatar(a.avatarUrl || "");
    setEditError("");
  }

  function cancelEdit() {
    setEditId(null);
    setEditError("");
  }

  async function handleSave(id: string) {
    setEditError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/blog/admin/authors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), bio: editBio.trim() || undefined, avatarUrl: editAvatar.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "Failed to save");
      } else {
        setAuthors((prev) => prev.map((a) => (a.id === id ? data.author : a)));
        setEditId(null);
      }
    } catch {
      setEditError("Failed to save");
    }
    setSaving(false);
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Deactivate this author? They won't appear in post dropdowns.")) return;
    const res = await fetch(`/api/blog/admin/authors/${id}`, { method: "DELETE" });
    if (res.ok) {
      setAuthors((prev) => prev.map((a) => (a.id === id ? { ...a, isActive: false } : a)));
    }
  }

  async function handleReactivate(id: string) {
    const res = await fetch(`/api/blog/admin/authors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
    if (res.ok) {
      const data = await res.json();
      setAuthors((prev) => prev.map((a) => (a.id === id ? data.author : a)));
    }
  }

  if (loading) return <div className="text-gray-400">Loading authors...</div>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-6">Author Profiles</h1>

      {/* Add Author Form */}
      <div className="mb-8 p-6 bg-[#141414] border border-gray-800 rounded-2xl">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Add Author</h2>
        {addError && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-300 text-sm">{addError}</div>
        )}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Name <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="e.g. Chef Adedemi"
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gold-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Bio</label>
            <textarea
              value={addBio}
              onChange={(e) => setAddBio(e.target.value)}
              rows={2}
              placeholder="Short bio shown on posts"
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gold-400 resize-y"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Avatar URL</label>
            <input
              type="url"
              value={addAvatar}
              onChange={(e) => setAddAvatar(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gold-400"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={adding || !addName.trim()}
            className="px-5 py-2.5 bg-gold-300 text-black font-semibold rounded-xl hover:bg-gold-400 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {adding ? "Adding..." : "Add Author"}
          </button>
        </div>
      </div>

      {/* Author List */}
      <div className="space-y-3">
        {authors.map((author) => (
          <div
            key={author.id}
            className={`p-5 bg-[#141414] border rounded-2xl transition ${author.isActive ? "border-gray-800" : "border-gray-800/50 opacity-60"}`}
          >
            {editId === author.id ? (
              /* Edit mode */
              <div className="space-y-3">
                {editError && (
                  <div className="p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-300 text-sm">{editError}</div>
                )}
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-gray-700 rounded-xl text-white focus:outline-none focus:border-gold-400 text-sm"
                  placeholder="Name"
                />
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gold-400 resize-y text-sm"
                  placeholder="Bio"
                />
                <input
                  type="url"
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gold-400 text-sm"
                  placeholder="Avatar URL"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave(author.id)}
                    disabled={saving || !editName.trim()}
                    className="px-4 py-2 bg-gold-300 text-black font-semibold rounded-xl hover:bg-gold-400 transition disabled:opacity-50 text-sm"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 bg-[#1a1a1a] border border-gray-700 text-gray-300 rounded-xl hover:bg-white/5 transition text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* View mode */
              <div className="flex items-start gap-4">
                {author.avatarUrl ? (
                  <img src={author.avatarUrl} alt={author.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gold-300/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-gold-300 text-lg font-bold">{author.name.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-white font-semibold">{author.name}</h3>
                    {author.id === meId && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gold-300/10 text-gold-300 border border-gold-300/20">You</span>
                    )}
                    {!author.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">Inactive</span>
                    )}
                  </div>
                  {author.bio && (
                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">{author.bio}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => startEdit(author)}
                    className="px-3 py-1.5 text-xs bg-[#1a1a1a] border border-gray-700 text-gray-300 rounded-lg hover:bg-white/5 transition"
                  >
                    Edit
                  </button>
                  {author.id !== meId && (
                    author.isActive ? (
                      <button
                        onClick={() => handleDeactivate(author.id)}
                        className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 transition"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(author.id)}
                        className="px-3 py-1.5 text-xs text-green-400 hover:text-green-300 transition"
                      >
                        Reactivate
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
