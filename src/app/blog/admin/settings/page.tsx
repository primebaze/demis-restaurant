"use client";

import { useState } from "react";

export default function BlogAdminSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/blog/admin/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to update password." });
      } else {
        setMessage({ type: "success", text: "Password updated successfully." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6 max-w-md">
        <h2 className="text-white font-semibold mb-4">Change Password</h2>

        {message && (
          <div
            className={`mb-4 px-4 py-3 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-[#0f0f0f] border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-gold-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-3 bg-[#0f0f0f] border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-gold-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-3 bg-[#0f0f0f] border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-gold-400"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full px-4 py-3 bg-gold-300 text-black font-semibold text-sm rounded-xl hover:bg-gold-400 transition disabled:opacity-50"
          >
            {saving ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
