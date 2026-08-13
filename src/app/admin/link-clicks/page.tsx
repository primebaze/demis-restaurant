"use client";

import { useCallback, useEffect, useState } from "react";

type CampaignRow = { campaign: string; clicks: number; lastClickAt: string | null };
type Clicker = { email: string; name: string; at: string; count: number };
type UrlRow = { url: string; clicks: number };

type Stats = {
  campaign: string;
  total: number;
  unique: number;
  identified: number;
  anonymous: number;
  scanners: number;
  lastClickAt: string | null;
  byUrl: UrlRow[];
  clickers: Clicker[];
};

function when(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "best-international-cuisine" → "Best international cuisine" */
function pretty(slug: string): string {
  const s = slug.replace(/-/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function LinkClicksPage() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Campaign list, and an initial selection: the vote campaign if it exists,
  // otherwise whichever was clicked most recently.
  const fetchCampaigns = useCallback(async () => {
    const res = await fetch("/api/admin/link-clicks");
    const data = await res.json();
    const rows: CampaignRow[] = data.campaigns || [];
    setCampaigns(rows);
    setSelected((cur) => cur || rows.find((r) => r.campaign === "vote")?.campaign || rows[0]?.campaign || "");
    setLoading(false);
  }, []);

  const fetchStats = useCallback(async (campaign: string) => {
    if (!campaign) return;
    setLoading(true);
    const res = await fetch(`/api/admin/link-clicks?campaign=${encodeURIComponent(campaign)}`);
    setStats(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  useEffect(() => {
    if (selected) fetchStats(selected);
  }, [selected, fetchStats]);

  function refresh() {
    fetchCampaigns();
    if (selected) fetchStats(selected);
  }

  const cards = [
    { label: "Clicks", value: stats?.total ?? 0, hint: "every click, repeats included" },
    { label: "People", value: stats?.unique ?? 0, hint: "distinct recipients" },
    { label: "Identified", value: stats?.identified ?? 0, hint: "matched to a contact" },
    { label: "Forwarded", value: stats?.anonymous ?? 0, hint: "no token — shared on" },
    { label: "Scanners", value: stats?.scanners ?? 0, hint: "filtered out of the totals" },
  ];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Link Clicks</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Who clicked the links in an email blast. Security scanners are counted separately so the
            real numbers stay honest.
          </p>
        </div>
        <button
          onClick={refresh}
          className="px-3 py-2 text-sm text-gray-300 border border-gray-700 rounded-lg hover:bg-white/5 transition"
        >
          Refresh
        </button>
      </div>

      {campaigns.length === 0 && !loading ? (
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-8 text-center">
          <p className="text-sm text-gray-400">No clicks tracked yet.</p>
          <p className="text-xs text-gray-600 mt-2">
            Links in an email blast are tracked automatically. Put <code className="text-gold-300">{"{vote}"}</code>{" "}
            in the message to insert the voting link.
          </p>
        </div>
      ) : (
        <>
          {/* Campaign picker */}
          <div className="flex gap-2 flex-wrap mb-6">
            {campaigns.map((c) => (
              <button
                key={c.campaign}
                onClick={() => setSelected(c.campaign)}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  selected === c.campaign
                    ? "bg-gold-300 text-black border-gold-300 font-semibold"
                    : "border-gray-700 text-gray-300 hover:bg-white/5"
                }`}
              >
                {c.campaign === "vote" ? "Vote" : pretty(c.campaign)}{" "}
                <span className={selected === c.campaign ? "text-black/60" : "text-gray-500"}>({c.clicks})</span>
              </button>
            ))}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {cards.map((s) => (
              <div key={s.label} className="rounded-xl p-4 border bg-[#1a1a1a] border-gray-800">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-[11px] text-gray-600 mt-1 leading-tight">{s.hint}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Per link */}
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-white mb-3">Links</h2>
              {stats?.byUrl?.length ? (
                <ul className="space-y-2">
                  {stats.byUrl.map((u) => (
                    <li key={u.url} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-gray-400 truncate" title={u.url}>
                        {u.url}
                      </span>
                      <span className="text-white font-semibold shrink-0">{u.clicks}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-600">No clicks yet.</p>
              )}
              <p className="text-xs text-gray-600 mt-4 pt-3 border-t border-gray-800">
                Last click: {when(stats?.lastClickAt ?? null)}
              </p>
            </div>

            {/* Who clicked */}
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-white mb-3">
                Who clicked{" "}
                {stats?.clickers?.length ? (
                  <span className="text-gray-500 font-normal">({stats.clickers.length})</span>
                ) : null}
              </h2>
              {stats?.clickers?.length ? (
                <div className="max-h-96 overflow-y-auto -mx-1 px-1">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-800">
                        <th className="py-2 font-medium">Contact</th>
                        <th className="py-2 font-medium text-right">First click</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.clickers.map((c) => (
                        <tr key={c.email + c.at} className="border-b border-gray-800/50">
                          <td className="py-2 pr-2">
                            <span className="text-white">{c.name || c.email}</span>
                            {c.name ? <span className="text-gray-600 text-xs block">{c.email}</span> : null}
                          </td>
                          <td className="py-2 text-right text-gray-400 whitespace-nowrap align-top">
                            {when(c.at)}
                            {c.count > 1 ? (
                              <span className="text-gray-600 text-xs block">{c.count} clicks</span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  Nobody yet. Clicks from forwarded copies land under &ldquo;Forwarded&rdquo; instead, since
                  they carry no token.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
