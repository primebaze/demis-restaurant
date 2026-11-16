"use client";

import { useEffect, useState, useCallback } from "react";

type BuffetBooking = {
  id: string;
  bookingCode: string;
  name: string;
  email: string;
  phone: string;
  partySize: number;
  date: string;
  time: string;
  locationSlug: string;
  notes: string;
  status: string;
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
};

const LOCATIONS: Record<string, string> = {
  cricklewood: "Cricklewood",
  streatham: "Streatham Hill",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminBuffetPage() {
  const [bookings, setBookings] = useState<BuffetBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [updating, setUpdating] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // New booking form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    partySize: "",
    date: "",
    time: "",
    locationSlug: "cricklewood",
    notes: "",
  });
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState("");

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    params.set("page", String(page));
    const res = await fetch(`/api/admin/buffet?${params}`);
    const data = await res.json();
    setBookings(data.bookings || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  }, [filterStatus, page]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  async function createBooking() {
    setFormError("");
    if (!form.name.trim()) { setFormError("Name is required"); return; }
    if (!form.date) { setFormError("Date is required"); return; }
    if (!form.time) { setFormError("Time is required"); return; }
    if (!form.partySize || parseInt(form.partySize) < 1) { setFormError("Party size must be at least 1"); return; }

    setCreating(true);
    try {
      const res = await fetch("/api/admin/buffet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, partySize: parseInt(form.partySize) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to create booking");
      } else {
        setSuccess(`Buffet booking ${data.booking.bookingCode} created`);
        setForm({ name: "", email: "", phone: "", partySize: "", date: "", time: "", locationSlug: "cricklewood", notes: "" });
        setShowForm(false);
        setPage(1);
        fetchBookings();
        setTimeout(() => setSuccess(""), 4000);
      }
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function cancelBooking(id: string, currentStatus: string) {
    setUpdating(id);
    const newStatus = currentStatus === "confirmed" ? "cancelled" : "confirmed";
    await fetch(`/api/admin/buffet/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setUpdating(null);
    fetchBookings();
  }

  async function deleteBooking(id: string) {
    if (!confirm("Delete this buffet booking permanently?")) return;
    setUpdating(id);
    await fetch(`/api/admin/buffet/${id}`, { method: "DELETE" });
    setUpdating(null);
    fetchBookings();
  }

  const inputCls = "w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 text-sm focus:outline-none focus:border-gold-400 placeholder-stone-400";
  const labelCls = "block text-xs text-stone-500 mb-1.5";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-stone-500 mt-0.5">{total} booking{total !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => { setShowForm((s) => !s); setFormError(""); }}
          className="px-4 py-2 bg-gold-300 text-ink-900 rounded-xl text-sm font-semibold hover:bg-gold-200 transition"
        >
          {showForm ? "Close" : "+ New Booking"}
        </button>
      </div>

      {success && (
        <div className="mb-6 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">{success}</div>
      )}

      {/* New booking form */}
      {showForm && (
        <div className="mb-8 bg-white border border-stone-100 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-stone-100">
            <h2 className="text-base font-semibold text-stone-900">New Buffet Booking</h2>
            <p className="text-xs text-stone-500 mt-0.5">Enter booking details taken by phone or in person.</p>
          </div>
          <div className="p-6">
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelCls}>Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Guest name" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="07700 000000" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Party Size *</label>
                <input type="number" min="1" value={form.partySize} onChange={(e) => setForm(f => ({ ...f, partySize: e.target.value }))} placeholder="e.g. 20" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Date *</label>
                <input type="date" value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls + " [color-scheme:light]"} />
              </div>
              <div>
                <label className={labelCls}>Time *</label>
                <input type="time" value={form.time} onChange={(e) => setForm(f => ({ ...f, time: e.target.value }))} className={inputCls + " [color-scheme:light]"} />
              </div>
              <div>
                <label className={labelCls}>Location</label>
                <select value={form.locationSlug} onChange={(e) => setForm(f => ({ ...f, locationSlug: e.target.value }))} className={inputCls}>
                  <option value="cricklewood">Cricklewood</option>
                  <option value="streatham">Streatham Hill</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes…" rows={2} className={inputCls + " resize-none"} />
              </div>
            </div>

            {formError && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{formError}</p>
            )}

            <div className="flex gap-3">
              <button onClick={createBooking} disabled={creating} className="px-5 py-2 bg-gold-300 text-ink-900 rounded-xl text-sm font-semibold hover:bg-gold-200 transition disabled:opacity-50">
                {creating ? "Saving…" : "Save Booking"}
              </button>
              <button onClick={() => { setShowForm(false); setFormError(""); }} className="px-4 py-2 text-sm text-stone-500 hover:text-stone-900 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-stone-900 text-sm focus:outline-none focus:border-gold-400"
        >
          <option value="">All Statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {filterStatus && (
          <button onClick={() => { setFilterStatus(""); setPage(1); }} className="px-3 py-2 text-sm text-stone-500 hover:text-stone-900 transition">
            Clear
          </button>
        )}
      </div>

      {/* Bookings table */}
      <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-stone-500">Loading bookings…</div>
        ) : bookings.length === 0 ? (
          <div className="p-8 text-center text-stone-500">No buffet bookings yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase text-stone-500 border-b border-stone-100">
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Guest</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Party</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="px-4 py-3 text-sm font-mono text-gold-700 font-semibold">{b.bookingCode}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-stone-900">{b.name}</p>
                      {(b.phone || b.email) && <p className="text-xs text-stone-500">{b.phone || b.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-700">{formatDate(b.date)}</td>
                    <td className="px-4 py-3 text-sm text-stone-700">{b.time}</td>
                    <td className="px-4 py-3 text-sm text-stone-500">{LOCATIONS[b.locationSlug] || b.locationSlug}</td>
                    <td className="px-4 py-3 text-sm text-stone-900">{b.partySize}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[b.status] || "bg-stone-100 text-stone-700"}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => cancelBooking(b.id, b.status)}
                          disabled={updating === b.id}
                          className={`text-xs px-3 py-1.5 rounded-lg transition disabled:opacity-50 ${
                            b.status === "confirmed"
                              ? "bg-red-50 text-red-700 hover:bg-red-50"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                          }`}
                        >
                          {updating === b.id ? "…" : b.status === "confirmed" ? "Cancel" : "Restore"}
                        </button>
                        <button
                          onClick={() => deleteBooking(b.id)}
                          disabled={updating === b.id}
                          className="text-xs px-2 py-1.5 text-stone-500 hover:text-red-700 transition disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-stone-100">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 text-sm text-stone-500 hover:text-stone-900 disabled:opacity-30 transition">
              ← Previous
            </button>
            <span className="text-sm text-stone-500">Page {page} of {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 text-sm text-stone-500 hover:text-stone-900 disabled:opacity-30 transition">
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
