"use client";

import { useEffect, useState, useCallback } from "react";

type Category = { id: string; name: string; slug: string; description: string };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/blog/admin/categories");
    const data = await res.json();
    setCategories(data.categories || []);
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    setSaving(true);
    const res = await fetch("/api/blog/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to create");
    } else {
      setName("");
      setDescription("");
      fetchCategories();
    }
    setSaving(false);
  }

  async function handleDelete(id: string, catName: string) {
    if (!confirm(`Delete category "${catName}"?`)) return;
    const res = await fetch(`/api/blog/admin/categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to delete");
    } else {
      fetchCategories();
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-6">Categories</h1>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-300 text-sm">{error}</div>
      )}

      <form onSubmit={handleCreate} className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Add Category</h2>
        <div className="space-y-4">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name"
            className="w-full px-4 py-3 bg-[#0f0f0f] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gold-400" />
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)"
            className="w-full px-4 py-3 bg-[#0f0f0f] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gold-400" />
          <button type="submit" disabled={saving || !name.trim()}
            className="px-6 py-2.5 bg-gold-300 text-black font-semibold rounded-xl text-sm hover:bg-gold-400 transition disabled:opacity-50">
            {saving ? "Adding..." : "Add Category"}
          </button>
        </div>
      </form>

      <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl overflow-hidden">
        {categories.length === 0 ? (
          <p className="p-6 text-gray-500 text-sm">No categories yet.</p>
        ) : (
          <div className="divide-y divide-gray-800">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-white font-medium">{cat.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">/{cat.slug}</p>
                  {cat.description && <p className="text-xs text-gray-600 mt-0.5">{cat.description}</p>}
                </div>
                <button onClick={() => handleDelete(cat.id, cat.name)}
                  className="text-xs text-red-400 hover:text-red-300 transition">
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
