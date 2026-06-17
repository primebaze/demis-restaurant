"use client";

import { useEffect, useState } from "react";

interface TodayBooking {
  id: string;
  confirmationCode: string;
  guest: string;
  location: string;
  time: string;
  slot: string;
  partySize: number;
  status: string;
  type: string;
}

const TYPE_COLORS: Record<string, string> = {
  Website: "bg-blue-500/15 text-blue-300",
  "Set Menu": "bg-purple-500/15 text-purple-300",
  Buffet: "bg-orange-500/15 text-orange-300",
};

interface DashboardData {
  today: {
    bookings: TodayBooking[];
    totalCovers: number;
    totalBookings: number;
  };
  stats: {
    totalBookings30d: number;
    confirmedBookings30d: number;
    noShows30d: number;
    noShowRate: string;
    totalCovers30d: number;
    depositsCapturedPence: number;
    upcomingNext7Days: number;
    totalGuests: number;
  };
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-emerald-500/20 text-emerald-400",
  modified: "bg-blue-500/20 text-blue-400",
  pending_payment: "bg-amber-500/20 text-amber-400",
  cancelled: "bg-red-500/20 text-red-400",
  no_show: "bg-red-600/20 text-red-500",
  completed: "bg-gray-500/20 text-gray-400",
};

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  if (!data) return null;

  const statCards = [
    { label: "Today's Bookings", value: data.today.totalBookings, accent: true },
    { label: "Today's Covers", value: data.today.totalCovers, accent: true },
    { label: "Next 7 Days", value: data.stats.upcomingNext7Days },
    { label: "30d Bookings", value: data.stats.totalBookings30d },
    { label: "30d Covers", value: data.stats.totalCovers30d },
    { label: "No-Show Rate", value: data.stats.noShowRate },
    { label: "Total Guests", value: data.stats.totalGuests },
    {
      label: "Deposits Captured",
      value: `£${(data.stats.depositsCapturedPence / 100).toFixed(2)}`,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <div
            key={s.label}
            className={`rounded-xl p-4 border ${
              s.accent
                ? "bg-gold-300/5 border-gold-300/20"
                : "bg-[#1a1a1a] border-gray-800"
            }`}
          >
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 truncate">
              {s.label}
            </p>
            <p className={`text-2xl font-bold ${s.accent ? "text-gold-300" : "text-white"}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Today's bookings table */}
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Today&apos;s Bookings</h2>
        </div>

        {data.today.bookings.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No bookings for today
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-800">
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Guest</th>
                  <th className="px-6 py-3">Location</th>
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3">Party</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.today.bookings.map((b) => (
                  <tr key={b.id} className="border-b border-gray-800/50 hover:bg-white/[0.02]">
                    <td className="px-6 py-4 text-sm font-mono text-gold-300">
                      {b.confirmationCode}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[b.type] || "bg-gray-700 text-gray-300"}`}>
                        {b.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-white">{b.guest}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{b.location}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{b.slot}</td>
                    <td className="px-6 py-4 text-sm text-white">{b.partySize}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[b.status] || "bg-gray-700 text-gray-300"
                        }`}
                      >
                        {b.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
