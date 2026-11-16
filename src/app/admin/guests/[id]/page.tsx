"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface GuestDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  tags: string;
  notes: string;
  createdAt: string;
  totalBookings: number;
  totalVisits: number;
  totalSpendPence: number;
  noShows: number;
  bookings: {
    id: string;
    confirmationCode: string;
    location: string;
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
    changes: { fieldChanged: string; oldValue: string; newValue: string; createdAt: string }[];
    createdAt: string;
  }[];
  visits: {
    id: string;
    visitDate: string;
    spendPence: number;
    notes: string | null;
    createdAt: string;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-emerald-50 text-emerald-700",
  modified: "bg-gold-100 text-gold-700",
  pending_payment: "bg-amber-50 text-amber-800",
  cancelled: "bg-red-50 text-red-700",
  no_show: "bg-red-50 text-red-700",
  completed: "bg-stone-100 text-stone-500",
};

export default function GuestProfilePage() {
  const params = useParams();
  const [guest, setGuest] = useState<GuestDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/guests/${params.id}`)
      .then((r) => r.json())
      .then((data) => setGuest(data.guest))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-stone-500">Loading guest profile...</div>
      </div>
    );
  }

  if (!guest) {
    return (
      <div className="text-center py-12">
        <p className="text-stone-500 mb-4">Guest not found</p>
        <Link href="/admin/guests" className="text-gold-700 hover:text-gold-700 text-sm">
          ← Back to Guests
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/admin/guests"
        className="text-sm text-stone-500 hover:text-gold-700 transition mb-4 block"
      >
        ← Back to Guests
      </Link>

      {/* Guest header */}
      <div className="bg-white border border-stone-100 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-normal tracking-tight text-stone-900 leading-tight">{guest.name}</h2>
            <p className="text-stone-500 mt-1">
              {guest.email} {guest.phone && `· ${guest.phone}`}
            </p>
            {guest.tags && (
              <div className="flex gap-1 mt-2">
                {guest.tags.split(",").map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-gold-100 text-gold-700 rounded-full text-xs"
                  >
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}
            {guest.notes && (
              <p className="text-sm text-stone-500 mt-2 italic">{guest.notes}</p>
            )}
          </div>
          <div className="text-right text-xs text-stone-500">
            Member since {new Date(guest.createdAt).toLocaleDateString("en-GB")}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-6 border-t border-stone-100">
          <div>
            <p className="text-xs text-stone-500 uppercase">Bookings</p>
            <p className="text-xl font-bold text-stone-900">{guest.totalBookings}</p>
          </div>
          <div>
            <p className="text-xs text-stone-500 uppercase">Visits</p>
            <p className="text-xl font-bold text-stone-900">{guest.totalVisits}</p>
          </div>
          <div>
            <p className="text-xs text-stone-500 uppercase">Total Spend</p>
            <p className="text-xl font-bold text-stone-900">
              £{(guest.totalSpendPence / 100).toFixed(0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500 uppercase">No-Shows</p>
            <p className={`text-xl font-bold ${guest.noShows > 0 ? "text-red-700" : "text-stone-900"}`}>
              {guest.noShows}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500 uppercase">Avg Spend</p>
            <p className="text-xl font-bold text-stone-900">
              £{guest.totalVisits > 0 ? (guest.totalSpendPence / 100 / guest.totalVisits).toFixed(0) : "0"}
            </p>
          </div>
        </div>
      </div>

      {/* Booking history */}
      <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-stone-100">
          <h2 className="text-lg font-semibold text-stone-900">Booking History</h2>
        </div>

        {guest.bookings.length === 0 ? (
          <div className="p-6 text-center text-stone-500">No bookings yet</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {guest.bookings.map((b) => (
              <div key={b.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-gold-700">{b.confirmationCode}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_COLORS[b.status] || "bg-stone-100 text-stone-700"
                      }`}
                    >
                      {b.status.replace("_", " ")}
                    </span>
                  </div>
                  <span className="text-xs text-stone-500">{b.source}</span>
                </div>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-stone-500">
                  <span>{b.date}</span>
                  <span>{b.slot}</span>
                  <span>{b.location}</span>
                  <span>{b.partySize} guests</span>
                  {b.depositAmountPence > 0 && (
                    <span>Deposit £{(b.depositAmountPence / 100).toFixed(2)} ({b.depositStatus})</span>
                  )}
                </div>
                {b.addOns.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {b.addOns.map((a, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gold-100 text-gold-700 rounded-full text-xs">
                        {a.name}
                      </span>
                    ))}
                  </div>
                )}
                {b.changes.length > 0 && (
                  <div className="mt-2 pl-3 border-l border-stone-100">
                    {b.changes.map((c, i) => (
                      <p key={i} className="text-xs text-stone-400">
                        {c.fieldChanged}: {c.oldValue} → {c.newValue}{" "}
                        <span className="text-stone-300">
                          ({new Date(c.createdAt).toLocaleDateString("en-GB")})
                        </span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Visit history */}
      <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100">
          <h2 className="text-lg font-semibold text-stone-900">Visit History</h2>
        </div>

        {guest.visits.length === 0 ? (
          <div className="p-6 text-center text-stone-500">No visits recorded yet</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {guest.visits.map((v) => (
              <div key={v.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm text-stone-900">{v.visitDate}</span>
                  {v.notes && <span className="text-sm text-stone-500 ml-2">— {v.notes}</span>}
                </div>
                <span className="text-sm text-gold-700">
                  £{(v.spendPence / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
