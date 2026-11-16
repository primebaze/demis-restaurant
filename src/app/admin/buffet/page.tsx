"use client";

import { useEffect, useState, useCallback } from "react";
import { CalendarX, Check, ChevronLeft, ChevronRight, CircleCheck, MapPin, Plus, Trash2, Undo2, Users, X } from "lucide-react";
import { Empty, OwnLayout, PageHead, Sheet, SheetFooter, SheetTitle, Tag, btn, field, fieldArea, statusLabel, statusTone, table, tableWrap, DateField } from "@/components/admin/ui";

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

  const labelCls = "mb-1.5 block px-1 text-xs font-light text-stone-500";
  const iconBtn =
    "flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition hover:border-stone-300 disabled:opacity-40";
  const isNew = (b: BuffetBooking) => Boolean(success) && success.includes(b.bookingCode);
  const statusName = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <OwnLayout>
      <PageHead
        title="Buffet bookings"
        subtitle="Group buffets at Cricklewood and Streatham Hill"
        actions={
          <button onClick={() => { setShowForm((s) => !s); setFormError(""); }} className={showForm ? btn.glass : btn.primary} aria-expanded={showForm}>
            {showForm ? <X className="h-[18px] w-[18px]" strokeWidth={1.75} /> : <Plus className="h-[18px] w-[18px]" strokeWidth={1.75} />}
            {showForm ? "Close" : "New booking"}
          </button>
        }
      />

      {/* Glass strip: count, status filter and the latest message */}
      <section aria-label="Bookings summary" className="glass mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[22px] px-5 py-3.5 text-white">
        <div>
          <div className="text-[13px] font-light text-white/85">Bookings</div>
          <div className="mt-0.5 text-2xl font-light md:text-[26px]">{total}</div>
        </div>
        <div className="inline-flex rounded-full border border-white/15 bg-[rgba(58,52,48,0.48)] p-1 backdrop-blur-xl" role="group" aria-label="Status">
          {([["", "All statuses"], ["confirmed", "Confirmed"], ["cancelled", "Cancelled"]] as const).map(([v, l]) => (
            <button
              key={v || "all"}
              onClick={() => { setFilterStatus(v); setPage(1); }}
              aria-pressed={filterStatus === v}
              className={`inline-flex h-9 items-center rounded-full px-4 text-sm whitespace-nowrap transition ${filterStatus === v ? "bg-white text-stone-900" : "text-white/90 hover:text-white"}`}
            >
              {l}
            </button>
          ))}
        </div>
        {success && (
          <div role="status" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm text-stone-900 md:ml-auto">
            <CircleCheck className="h-4 w-4 shrink-0 text-emerald-700" strokeWidth={1.75} />
            {success}
          </div>
        )}
      </section>

      <div className={`grid items-start gap-4 ${showForm ? "lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
        {/* Bookings list */}
        <Sheet label="Buffet bookings" className="overflow-hidden">
          <div className="flex flex-wrap items-baseline gap-x-3 px-4 pb-3 pt-4 md:px-5 md:pt-5">
            <h2 className="font-outfit text-[22px] font-normal tracking-tight">
              {filterStatus ? `${statusName(filterStatus)} buffet bookings` : "All buffet bookings"}
            </h2>
            <span className="text-[13px] font-light text-stone-500">{total} booking{total !== 1 ? "s" : ""}</span>
          </div>

          {loading ? (
            <Empty>Loading bookings…</Empty>
          ) : bookings.length === 0 ? (
            <Empty>No buffet bookings yet</Empty>
          ) : (
            <>
              {/* Table: iPad and desktop */}
              <div className={`hidden md:block ${tableWrap}`}>
                <table className={`${table} [&_td:first-child]:pl-5 [&_th:first-child]:pl-5 [&_td:last-child]:pr-5 [&_th:last-child]:pr-5`}>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Guest</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Location</th>
                      <th>Party</th>
                      <th>Status</th>
                      <th><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => {
                      const off = b.status === "cancelled";
                      return (
                        <tr key={b.id} className={`transition-colors ${isNew(b) ? "bg-gold-50" : "hover:bg-stone-50"} ${off ? "text-stone-400" : ""}`}>
                          <td className={`whitespace-nowrap font-mono text-xs ${isNew(b) ? "text-gold-700" : "text-stone-500"}`}>{b.bookingCode}</td>
                          <td>
                            <div>{b.name}</div>
                            {(b.phone || b.email) && <div className="text-xs font-light text-stone-500">{b.phone || b.email}</div>}
                          </td>
                          <td className="whitespace-nowrap">{formatDate(b.date)}</td>
                          <td className="whitespace-nowrap">{b.time}</td>
                          <td className="whitespace-nowrap">{LOCATIONS[b.locationSlug] || b.locationSlug}</td>
                          <td className="whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5">
                              <Users className="h-4 w-4 text-stone-400" strokeWidth={1.5} />
                              {b.partySize}
                            </span>
                          </td>
                          <td><Tag tone={statusTone(b.status)}>{statusLabel(b.status)}</Tag></td>
                          <td>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => cancelBooking(b.id, b.status)}
                                disabled={updating === b.id}
                                aria-label={b.status === "confirmed" ? `Cancel ${b.bookingCode}` : `Restore ${b.bookingCode}`}
                                title={b.status === "confirmed" ? "Cancel" : "Restore"}
                                className={`${iconBtn} ${b.status === "confirmed" ? "hover:text-red-700" : "hover:text-emerald-700"}`}
                              >
                                {b.status === "confirmed" ? <CalendarX className="h-4 w-4" strokeWidth={1.5} /> : <Undo2 className="h-4 w-4" strokeWidth={1.5} />}
                              </button>
                              <button
                                onClick={() => deleteBooking(b.id)}
                                disabled={updating === b.id}
                                aria-label={`Delete ${b.bookingCode}`}
                                title="Delete"
                                className={`${iconBtn} hover:text-red-700`}
                              >
                                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Cards: phones */}
              <div className="space-y-2 px-3 pb-3 md:hidden">
                {bookings.map((b) => {
                  const off = b.status === "cancelled";
                  return (
                    <article key={b.id} className={`rounded-[18px] p-3.5 ${isNew(b) ? "bg-gold-50" : "bg-stone-50"} ${off ? "text-stone-400" : ""}`}>
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[15px]">{b.name}</div>
                          <div className="text-xs font-light text-stone-500">
                            <span className="font-mono">{b.bookingCode}</span>
                            {(b.phone || b.email) && <> · {b.phone || b.email}</>}
                          </div>
                        </div>
                        <Tag tone={statusTone(b.status)}>{statusLabel(b.status)}</Tag>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
                        <span>{formatDate(b.date)} · {b.time}</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-stone-400" strokeWidth={1.5} />
                          {LOCATIONS[b.locationSlug] || b.locationSlug}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-stone-400" strokeWidth={1.5} />
                          {b.partySize}
                        </span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => cancelBooking(b.id, b.status)} disabled={updating === b.id} className={btn.small}>
                          {b.status === "confirmed" ? <CalendarX className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Undo2 className="h-3.5 w-3.5" strokeWidth={1.5} />}
                          {updating === b.id ? "…" : b.status === "confirmed" ? "Cancel" : "Restore"}
                        </button>
                        <button onClick={() => deleteBooking(b.id)} disabled={updating === b.id} className={`${btn.small} hover:text-red-700`}>
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}

          {totalPages > 1 && (
            <SheetFooter>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className={btn.small}>
                <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
                Previous
              </button>
              <span className="mx-auto text-stone-500">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-stone-900 px-3 text-[13px] text-white transition hover:bg-black disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </SheetFooter>
          )}
        </Sheet>

        {/* New booking form */}
        {showForm && (
          <Sheet label="New buffet booking" className="order-first p-5 lg:order-none">
            <SheetTitle
              aside={
                <button
                  onClick={() => { setShowForm(false); setFormError(""); }}
                  aria-label="Close"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 text-stone-600 hover:text-stone-900"
                >
                  <X className="h-4 w-4" strokeWidth={1.75} />
                </button>
              }
            >
              New buffet booking
            </SheetTitle>
            <p className="mt-0.5 text-[13px] font-light text-stone-500">Enter booking details taken by phone or in person.</p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Guest name" className={field} />
              </div>
              <div className="col-span-2 sm:col-span-1 lg:col-span-2 xl:col-span-1">
                <label className={labelCls}>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" className={field} />
              </div>
              <div className="col-span-2 sm:col-span-1 lg:col-span-2 xl:col-span-1">
                <label className={labelCls}>Phone</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="07700 000000" className={field} />
              </div>
              <div>
                <label className={labelCls}>Party size *</label>
                <input type="number" min="1" value={form.partySize} onChange={(e) => setForm(f => ({ ...f, partySize: e.target.value }))} placeholder="e.g. 20" className={field} />
              </div>
              <div>
                <label className={labelCls}>Location</label>
                <select value={form.locationSlug} onChange={(e) => setForm(f => ({ ...f, locationSlug: e.target.value }))} className={field}>
                  <option value="cricklewood">Cricklewood</option>
                  <option value="streatham">Streatham Hill</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Date *</label>
                <DateField value={form.date} onChange={(v) => setForm(f => ({ ...f, date: v }))} />
              </div>
              <div>
                <label className={labelCls}>Time *</label>
                <input type="time" value={form.time} onChange={(e) => setForm(f => ({ ...f, time: e.target.value }))} className={field} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes…" rows={2} className={`${fieldArea} resize-none`} />
              </div>
            </div>

            {formError && (
              <p className="mt-3 rounded-2xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{formError}</p>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={createBooking} disabled={creating} className={btn.primary}>
                <Check className="h-[18px] w-[18px]" strokeWidth={1.75} />
                {creating ? "Saving…" : "Save booking"}
              </button>
              <button onClick={() => { setShowForm(false); setFormError(""); }} className={btn.light}>
                Cancel
              </button>
            </div>
          </Sheet>
        )}
      </div>
    </OwnLayout>
  );
}
