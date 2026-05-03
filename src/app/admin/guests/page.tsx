"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface GuestRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  tags: string;
  notes: string;
  totalBookings: number;
  totalVisits: number;
  totalSpendPence: number;
  lastBooking: { date: string; status: string } | null;
  createdAt: string;
}

interface ComposeState {
  mode: "single" | "all";
  guestId?: string;
  toLabel: string;
  subject: string;
  message: string;
  sending: boolean;
  error: string;
  success: string;
  failures: { name: string; email: string }[];
}

function EnvelopeIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

export default function AdminGuestsPage() {
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [exporting, setExporting] = useState(false);

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTags, setEditTags] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Compose modal
  const [compose, setCompose] = useState<ComposeState | null>(null);

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", String(page));

    const res = await fetch(`/api/admin/guests?${params}`);
    const data = await res.json();
    setGuests(data.guests || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  }, [search, page]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function startEdit(guest: GuestRow) {
    setEditingId(guest.id);
    setEditTags(guest.tags || "");
    setEditNotes(guest.notes || "");
  }

  async function saveEdit() {
    if (!editingId) return;
    await fetch("/api/admin/guests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, tags: editTags, notes: editNotes }),
    });
    setEditingId(null);
    fetchGuests();
  }

  async function exportPdf() {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/guests?export=true&page=1");
      const data = await res.json();
      const allGuests: GuestRow[] = data.guests || [];

      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(16);
      doc.text("Guest CRM — Demi's Restaurant", 14, 16);
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(`Exported ${new Date().toLocaleDateString("en-GB")} · ${allGuests.length} guests`, 14, 23);

      autoTable(doc, {
        startY: 28,
        head: [["Name", "Email", "Phone", "Tags", "Bookings", "Visits", "Spend", "Last Booking"]],
        body: allGuests.map((g) => [
          g.name,
          g.email || "—",
          g.phone || "—",
          g.tags || "—",
          g.totalBookings,
          g.totalVisits,
          `£${(g.totalSpendPence / 100).toFixed(2)}`,
          g.lastBooking ? `${g.lastBooking.date} (${g.lastBooking.status})` : "—",
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [26, 26, 26], textColor: [232, 204, 156] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      doc.save(`demis-guests-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  function openComposeSingle(guest: GuestRow) {
    setCompose({
      mode: "single",
      guestId: guest.id,
      toLabel: `${guest.name} <${guest.email}>`,
      subject: "",
      message: "",
      sending: false,
      error: "",
      success: "",
      failures: [],
    });
  }

  function openComposeAll() {
    setCompose({
      mode: "all",
      toLabel: "All guests with email address",
      subject: "",
      message: "",
      sending: false,
      error: "",
      success: "",
      failures: [],
    });
  }

  async function sendEmail() {
    if (!compose) return;
    if (!compose.subject.trim()) {
      setCompose((c) => c && { ...c, error: "Subject is required" });
      return;
    }
    if (!compose.message.trim()) {
      setCompose((c) => c && { ...c, error: "Message is required" });
      return;
    }

    setCompose((c) => c && { ...c, sending: true, error: "" });

    const body =
      compose.mode === "all"
        ? { all: true, subject: compose.subject, message: compose.message }
        : { guestId: compose.guestId, subject: compose.subject, message: compose.message };

    const res = await fetch("/api/admin/email/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      setCompose((c) => c && { ...c, sending: false, error: data.error || "Failed to send" });
    } else {
      const successMsg = data.failed > 0
        ? `Sent to ${data.sent} · ${data.failed} failed`
        : `Sent to ${data.sent} recipient${data.sent !== 1 ? "s" : ""}`;
      setCompose((c) => c && { ...c, sending: false, success: successMsg, failures: data.failures || [] });
      if (data.failed === 0) setTimeout(() => setCompose(null), 2500);
    }
  }

  const inputCls = "w-full px-3 py-2.5 bg-[#0f0f0f] border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gold-400";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Guest CRM</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} guests</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/guests/import"
            className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-gray-700 text-sm text-gray-300 hover:text-gold-300 hover:border-gold-300/40 rounded-xl transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
            </svg>
            Import
          </Link>
          <button
            onClick={exportPdf}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-gray-700 text-sm text-gray-300 hover:text-gold-300 hover:border-gold-300/40 rounded-xl disabled:opacity-50 transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {exporting ? "Exporting…" : "Export PDF"}
          </button>
          <button
            onClick={openComposeAll}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-gray-700 text-sm text-gray-300 hover:text-gold-300 hover:border-gold-300/40 rounded-xl transition"
          >
            <EnvelopeIcon />
            Email All Guests
          </button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="flex-1 px-4 py-2.5 bg-[#1a1a1a] border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gold-400"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-gold-300 text-black font-medium text-sm rounded-xl hover:bg-gold-400 transition"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSearchInput("");
                setPage(1);
              }}
              className="px-3 py-2.5 text-sm text-gray-400 hover:text-white transition"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Guest list */}
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading guests...</div>
        ) : guests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No guests found</div>
        ) : (
          <div className="divide-y divide-gray-800">
            {guests.map((g) => (
              <div key={g.id} className="p-4 hover:bg-white/[0.02]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/guests/${g.id}`}
                        className="text-white font-medium hover:text-gold-300 transition"
                      >
                        {g.name}
                      </Link>
                      {g.tags && (
                        <div className="flex gap-1">
                          {g.tags.split(",").map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 bg-gold-300/10 text-gold-300 rounded text-[10px]"
                            >
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {g.email} {g.phone && `· ${g.phone}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-400 shrink-0">
                    <div className="text-center hidden sm:block">
                      <p className="text-white font-medium text-sm">{g.totalBookings}</p>
                      <p>Bookings</p>
                    </div>
                    <div className="text-center hidden sm:block">
                      <p className="text-white font-medium text-sm">{g.totalVisits}</p>
                      <p>Visits</p>
                    </div>
                    <div className="text-center hidden sm:block">
                      <p className="text-white font-medium text-sm">
                        £{(g.totalSpendPence / 100).toFixed(0)}
                      </p>
                      <p>Spend</p>
                    </div>
                    {g.email && (
                      <button
                        onClick={() => openComposeSingle(g)}
                        title="Email this guest"
                        className="px-2 py-1 text-xs text-gray-400 hover:text-gold-300 border border-gray-700 hover:border-gold-300/40 rounded transition flex items-center gap-1"
                      >
                        <EnvelopeIcon />
                      </button>
                    )}
                    <button
                      onClick={() => startEdit(g)}
                      className="px-2 py-1 text-xs text-gray-400 hover:text-gold-300 border border-gray-700 rounded transition"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                {g.lastBooking && (
                  <p className="text-xs text-gray-600 mt-1">
                    Last booking: {g.lastBooking.date} ({g.lastBooking.status})
                  </p>
                )}

                {/* Inline edit */}
                {editingId === g.id && (
                  <div className="mt-3 p-3 bg-[#0f0f0f] rounded-xl space-y-2">
                    <div>
                      <label className="text-xs text-gray-500">Tags (comma-separated)</label>
                      <input
                        type="text"
                        value={editTags}
                        onChange={(e) => setEditTags(e.target.value)}
                        placeholder="VIP, regular, birthday"
                        className="w-full mt-1 px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gold-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Notes</label>
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        rows={2}
                        placeholder="Allergies, preferences..."
                        className="w-full mt-1 px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gold-400 resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="px-3 py-1.5 bg-gold-300 text-black font-medium text-xs rounded-lg hover:bg-gold-400 transition"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 text-gray-400 text-xs hover:text-white transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-white disabled:opacity-30 transition"
            >
              ← Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-white disabled:opacity-30 transition"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Compose modal */}
      {compose && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold text-white mb-5">Send Email</h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">To</label>
                <p className="mt-1 px-3 py-2.5 bg-[#0f0f0f] border border-gray-800 rounded-xl text-sm text-gray-400 truncate">
                  {compose.toLabel}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Subject</label>
                <input
                  type="text"
                  value={compose.subject}
                  onChange={(e) => setCompose((c) => c && { ...c, subject: e.target.value })}
                  placeholder="e.g. Special offer for you"
                  className={`mt-1 ${inputCls}`}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Message</label>
                <textarea
                  value={compose.message}
                  onChange={(e) => setCompose((c) => c && { ...c, message: e.target.value })}
                  rows={8}
                  placeholder="Write your message here..."
                  className={`mt-1 ${inputCls} resize-none`}
                />
              </div>
            </div>

            {compose.error && (
              <p className="mt-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {compose.error}
              </p>
            )}
            {compose.success && (
              <div className="mt-3">
                <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                  {compose.success}
                </p>
                {compose.failures.length > 0 && (
                  <div className="mt-2 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                    <p className="text-xs text-red-400 font-medium mb-2">Failed deliveries:</p>
                    <ul className="space-y-1">
                      {compose.failures.map((f) => (
                        <li key={f.email} className="text-xs text-gray-400">
                          {f.name} — <span className="text-red-400">{f.email}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={sendEmail}
                disabled={compose.sending}
                className="flex-1 py-2.5 bg-gold-300 text-black font-semibold text-sm rounded-xl hover:bg-gold-400 disabled:opacity-50 transition"
              >
                {compose.sending ? "Sending… (this may take a moment)" : "Send"}
              </button>
              <button
                onClick={() => setCompose(null)}
                disabled={compose.sending}
                className="px-5 py-2.5 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
