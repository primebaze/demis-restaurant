"use client";

import { useState, useEffect, useCallback } from "react";

type Tab = "profile" | "password";

export default function BlogAdminSettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");

  const TABS: { key: Tab; label: string }[] = [
    { key: "profile", label: "Profile" },
    { key: "password", label: "Password" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      <div className="flex gap-1 mb-6 bg-ink-900 rounded-xl p-1 border border-white/[0.06] w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.key
                ? "bg-gold-300/10 text-gold-300"
                : "text-stone-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && <ProfilePanel />}
      {tab === "password" && <PasswordPanel />}
    </div>
  );
}

function ProfilePanel() {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/blog/admin/profile");
      if (res.ok) {
        const data = await res.json();
        setName(data.name || "");
        setBio(data.bio || "");
        setAvatarUrl(data.avatarUrl || "");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/blog/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setAvatarUrl(data.url);
      } else {
        setMessage({ type: "error", text: data.error || "Upload failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Upload failed" });
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      const res = await fetch("/api/blog/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio, avatarUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to update profile." });
      } else {
        setMessage({ type: "success", text: "Profile updated successfully." });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-stone-400 py-8">Loading profile...</div>;
  }

  return (
    <div className="bg-ink-900 border border-white/[0.06] rounded-2xl p-6 max-w-md">
      <h2 className="text-white font-semibold mb-4">Edit Profile</h2>

      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-ink-950 border border-white/10 overflow-hidden flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-600 text-xl">
                {name.charAt(0).toUpperCase() || "?"}
              </div>
            )}
          </div>
          <div>
            <label className="px-3 py-1.5 text-xs bg-gold-300/10 text-gold-300 border border-gold-300/30 rounded-lg cursor-pointer hover:bg-gold-300/20 transition inline-block">
              {uploading ? "Uploading..." : "Upload Photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl("")}
                className="ml-2 text-xs text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="text-xs text-stone-500 block mb-1">Display Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
            className="w-full px-4 py-3 bg-ink-950 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-gold-400"
          />
        </div>

        <div>
          <label className="text-xs text-stone-500 block mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="A short bio that appears on your blog posts..."
            className="w-full px-4 py-3 bg-ink-950 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-gold-400 resize-none"
          />
          <span className="text-[10px] text-stone-600">{bio.length}/500</span>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full px-4 py-3 bg-gold-300 text-black font-semibold text-sm rounded-xl hover:bg-gold-400 transition disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </div>
  );
}

function PasswordPanel() {
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
    <div className="bg-ink-900 border border-white/[0.06] rounded-2xl p-6 max-w-md">
      <h2 className="text-white font-semibold mb-4">Change Password</h2>

      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-stone-500 block mb-1">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="w-full px-4 py-3 bg-ink-950 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-gold-400"
          />
        </div>
        <div>
          <label className="text-xs text-stone-500 block mb-1">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-4 py-3 bg-ink-950 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-gold-400"
          />
        </div>
        <div>
          <label className="text-xs text-stone-500 block mb-1">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-4 py-3 bg-ink-950 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-gold-400"
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
  );
}
