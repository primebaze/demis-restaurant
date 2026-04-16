"use client";

import { useEffect, useState, useCallback } from "react";

interface BookingRow {
  id: string;
  confirmationCode: string;
  guest: { name: string; email: string; phone: string };
  location: string;
  locationSlug: string;
  date: string;
  time: string;
  slot: string;
  partySize: number;
  status: string;
  source: string;
  notes: string | null;
  depositAmountPence: number;
  depositStatus: string;
  addOns: { name: string; pricePence: number }[];
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-emerald-500/20 text-emerald-400",
  modified: "bg-blue-500/20 text-blue-400",
  pending_payment: "bg-amber-500/20 text-amber-400",
  cancelled: "bg-red-500/20 text-red-400",
  no_show: "bg-red-600/20 text-red-500",
  completed: "bg-gray-500/20 text-gray-400",
};

const STATUS_OPTIONS = [
  "confirmed",
  "modified",
  "pending_payment",
  "cancelled",
  "no_show",
  "completed",
];

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [filterDate, setFilterDate] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Expanded row for detail view
  const [expanded, setExpanded] = useState<string | null>(null);

  // Status update
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterDate) params.set("date", filterDate);
    if (filterLocation) params.set("location", filterLocation);
    if (filterStatus) params.set("status", filterStatus);
    params.set("page", String(page));

    const res = await fetch(`/api/admin/bookings?${params}`);
    const data = await res.json();
    setBookings(data.bookings || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  }, [filterDate, filterLocation, filterStatus, page]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  async function updateStatus(bookingId: string, newStatus: string) {
    setUpdating(bookingId);
    await fetch(`/api/admin/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setUpdating(null);
    fetchBookings();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Bookings</h1>
        <span className="text-sm text-gray-500">{total} total</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="date"
          value={filterDate}
          onChange={(e) => {
            setFilterDate(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gold-400 [color-scheme:dark]"
        />
        <select
          value={filterLocation}
          onChange={(e) => {
            setFilterLocation(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gold-400"
        >
          <option value="">All Locations</option>
          <option value="cricklewood">Cricklewood</option>
          <option value="streatham">Streatham Hill</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gold-400"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
        {(filterDate || filterLocation || filterStatus) && (
          <button
            onClick={() => {
              setFilterDate("");
              setFilterLocation("");
              setFilterStatus("");
              setPage(1);
            }}
            className="px-3 py-2 text-sm text-gray-400 hover:text-white transition"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No bookings found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-800">
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Guest</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Party</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <>
                    <tr
                      key={b.id}
                      className="border-b border-gray-800/50 hover:bg-white/[0.02] cursor-pointer"
                      onClick={() => setExpanded(expanded === b.id ? null : b.id)}
                    >
                      <td className="px-4 py-3 text-sm font-mono text-gold-300">
                        {b.confirmationCode}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-white">{b.guest.name}</p>
                        <p className="text-xs text-gray-500">{b.guest.email}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{b.date}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{b.slot}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{b.location}</td>
                      <td className="px-4 py-3 text-sm text-white">{b.partySize}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_COLORS[b.status] || "bg-gray-700 text-gray-300"
                          }`}
                        >
                          {b.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value=""
                          onChange={(e) => {
                            e.stopPropagation();
                            if (e.target.value) updateStatus(b.id, e.target.value);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          disabled={updating === b.id}
                          className="px-2 py-1 bg-[#0f0f0f] border border-gray-700 rounded text-xs text-white focus:outline-none"
                        >
                          <option value="">Update...</option>
                          {STATUS_OPTIONS.filter((s) => s !== b.status).map((s) => (
                            <option key={s} value={s}>
                              → {s.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>

                    {/* Expanded detail */}
                    {expanded === b.id && (
                      <tr key={`${b.id}-detail`} className="bg-[#141414]">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500 block text-xs">Phone</span>
                              <span className="text-white">{b.guest.phone || "—"}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-xs">Source</span>
                              <span className="text-white">{b.source}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-xs">Deposit</span>
                              <span className="text-white">
                                {b.depositAmountPence > 0
                                  ? `£${(b.depositAmountPence / 100).toFixed(2)} (${b.depositStatus})`
                                  : "None"}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-xs">Booked</span>
                              <span className="text-white">
                                {new Date(b.createdAt).toLocaleDateString("en-GB")}
                              </span>
                            </div>
                            {b.notes && (
                              <div className="col-span-2 md:col-span-4">
                                <span className="text-gray-500 block text-xs">Notes</span>
                                <span className="text-white">{b.notes}</span>
                              </div>
                            )}
                            {b.addOns.length > 0 && (
                              <div className="col-span-2 md:col-span-4">
                                <span className="text-gray-500 block text-xs">Add-ons</span>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {b.addOns.map((a, i) => (
                                    <span
                                      key={i}
                                      className="px-2 py-0.5 bg-gold-300/10 text-gold-300 rounded-full text-xs"
                                    >
                                      {a.name} (£{(a.pricePence / 100).toFixed(2)})
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
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
    </div>
  );
}
