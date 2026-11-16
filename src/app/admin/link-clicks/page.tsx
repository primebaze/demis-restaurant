"use client";

import { useCallback, useEffect, useState } from "react";
import { AtSign, ChevronLeft, ChevronRight, Clock, Link2, RefreshCw } from "lucide-react";
import { Avatar, Empty, GlassStats, OwnLayout, PageHead, Sheet, SheetFooter, SheetTitle, btn, table, tableWrap } from "@/components/admin/ui";

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
  page: number;
  totalPages: number;
};

function when(iso: string | null): string {
  if (!iso) return "None yet";
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

function campaignLabel(campaign: string): string {
  return campaign === "vote" ? "Vote" : pretty(campaign);
}

/** Round "@" circle for a click we only have an email for. */
function EmailAvatar() {
  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand-200 text-stone-500">
      <AtSign className="h-4 w-4" strokeWidth={1.75} />
    </span>
  );
}

function Contact({ c }: { c: Clicker }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {c.name ? <Avatar name={c.name} /> : <EmailAvatar />}
      <div className="min-w-0">
        <div className="truncate text-stone-900">{c.name || c.email}</div>
        {c.name ? <div className="truncate text-xs text-stone-500">{c.email}</div> : null}
      </div>
    </div>
  );
}

export default function LinkClicksPage() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [page, setPage] = useState(1);
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

  const fetchStats = useCallback(async (campaign: string, p: number) => {
    if (!campaign) return;
    setLoading(true);
    const res = await fetch(
      `/api/admin/link-clicks?campaign=${encodeURIComponent(campaign)}&page=${p}`
    );
    setStats(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  useEffect(() => {
    if (selected) fetchStats(selected, page);
  }, [selected, page, fetchStats]);

  /** Switching campaign must drop back to page 1, or you land past the end. */
  function pickCampaign(campaign: string) {
    setSelected(campaign);
    setPage(1);
  }

  function refresh() {
    fetchCampaigns();
    if (selected) fetchStats(selected, page);
  }

  const cards = [
    { label: "Clicks", value: stats?.total ?? 0, hint: "every click, repeats included" },
    { label: "People", value: stats?.unique ?? 0, hint: "distinct recipients" },
    { label: "Identified", value: stats?.identified ?? 0, hint: "matched to a contact" },
    { label: "Forwarded", value: stats?.anonymous ?? 0, hint: "no token, shared on" },
    { label: "Scanners", value: stats?.scanners ?? 0, hint: "filtered out of the totals" },
  ];

  const maxClicks = Math.max(1, ...campaigns.map((c) => c.clicks));
  const empty = campaigns.length === 0 && !loading;

  return (
    <OwnLayout>
      <PageHead
        title="Link Clicks"
        subtitle="Who clicked the links in an email blast. Security scanners are counted apart so the real numbers stay honest."
        actions={
          <>
            {campaigns.map((c) => {
              const on = selected === c.campaign;
              return (
                <button
                  key={c.campaign}
                  type="button"
                  onClick={() => pickCampaign(c.campaign)}
                  aria-pressed={on}
                  className={on ? btn.primary : btn.glass}
                >
                  {campaignLabel(c.campaign)}
                  <span className={`text-[13px] ${on ? "text-ink-900/70" : "text-white/75"}`}>{c.clicks}</span>
                </button>
              );
            })}
            <button type="button" onClick={refresh} aria-label="Refresh" title="Refresh" className="gbtn round">
              <RefreshCw className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </>
        }
      />

      {empty ? (
        <Sheet label="No clicks yet" className="px-5 py-12 text-center">
          <p className="text-sm text-stone-500">No clicks tracked yet.</p>
          <p className="mt-2 text-xs text-stone-500">
            Links in an email blast are tracked automatically. Put <code className="text-stone-900">{"{vote}"}</code>{" "}
            in the message to insert the voting link.
          </p>
        </Sheet>
      ) : (
        <>
          <GlassStats items={cards} />

          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2 lg:items-stretch">
            {/* Per campaign and per link */}
            <Sheet label="Links" className="flex flex-col p-4 md:p-5 lg:sticky lg:top-[96px] lg:max-h-[calc(100vh-112px)] lg:overflow-y-auto lg:self-start">
              <SheetTitle>
                Links <span className="ml-1.5 text-[13px] font-light text-stone-500">Clicks by campaign</span>
              </SheetTitle>

              {campaigns.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <div
                    role="group"
                    aria-label="Clicks by campaign"
                    className="mx-auto grid gap-3 px-1 md:px-6"
                    style={{ gridTemplateColumns: `repeat(${campaigns.length}, minmax(64px, 1fr))`, maxWidth: campaigns.length * 170 }}
                  >
                    {campaigns.map((c) => {
                      const on = selected === c.campaign;
                      const h = Math.max(6, Math.round((c.clicks / maxClicks) * 100));
                      return (
                        <button
                          key={c.campaign}
                          type="button"
                          onClick={() => pickCampaign(c.campaign)}
                          aria-pressed={on}
                          aria-label={`${campaignLabel(c.campaign)}: ${c.clicks} clicks`}
                          className="group flex min-w-0 flex-col items-stretch"
                        >
                          <span className="relative flex h-[170px] items-end">
                            <span
                              className={`relative w-full rounded-t-[12px] rounded-b-[4px] transition-colors ${on ? "bg-honey-300" : "bg-sand-200 group-hover:bg-honey-200"}`}
                              style={{ height: `${h}%` }}
                            >
                              <span
                                className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap ${
                                  on ? "-top-7 rounded-full bg-stone-900 px-2.5 py-0.5 text-[11px] font-medium text-white" : "-top-6 text-xs text-stone-500"
                                }`}
                              >
                                {c.clicks}
                              </span>
                            </span>
                          </span>
                          <span className={`mt-2 truncate text-center text-xs ${on ? "text-stone-900" : "text-stone-500"}`}>{campaignLabel(c.campaign)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-6 mb-1.5 text-xs text-stone-500">{selected ? `${campaignLabel(selected)} links` : "Links"}</div>
              {stats?.byUrl?.length ? (
                <ul>
                  {stats.byUrl.map((u) => (
                    <li key={u.url} className="flex items-center gap-3 border-t border-sand-200 py-2.5 text-sm">
                      <Link2 className="h-[18px] w-[18px] shrink-0 text-stone-500" strokeWidth={1.5} />
                      <span className="min-w-0 flex-1 truncate text-stone-600" title={u.url}>
                        {u.url}
                      </span>
                      <span className="shrink-0 tabular-nums text-stone-900">{u.clicks}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="border-t border-sand-200 py-3 text-sm text-stone-500">No clicks yet.</p>
              )}

              <div className="min-h-4 flex-1" />
              <p className="flex items-center gap-2 border-t border-sand-200 pt-3 text-[13px] text-stone-600">
                <Clock className="h-4 w-4" strokeWidth={1.5} />
                Last click: {when(stats?.lastClickAt ?? null)}
              </p>
            </Sheet>

            {/* Who clicked */}
            <Sheet label="Who clicked" className="flex flex-col overflow-hidden">
              <div className="px-4 pb-3 pt-4 md:px-5">
                <SheetTitle>
                  Who clicked
                  {stats?.identified ? <span className="ml-1.5 text-[13px] font-light text-stone-500">{stats.identified}</span> : null}
                </SheetTitle>
              </div>

              {stats?.clickers?.length ? (
                <div className={`min-h-0 flex-1 transition-opacity ${loading ? "opacity-50" : ""}`}>
                  {/* Phones: a simple list */}
                  <ul className="md:hidden">
                    {stats.clickers.map((c) => (
                      <li key={c.email + c.at} className="flex items-center gap-3 border-t border-sand-200 px-4 py-3 text-sm">
                        <div className="min-w-0 flex-1">
                          <Contact c={c} />
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="whitespace-nowrap text-stone-900">{when(c.at)}</div>
                          {c.count > 1 ? <div className="text-xs text-stone-500">{c.count} clicks</div> : null}
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* iPad and up: the table */}
                  <div className={`${tableWrap} hidden md:block md:max-h-[520px] md:overflow-y-auto`}>
                    <table className={`${table} [&_td:first-child]:pl-5 [&_td:last-child]:pr-5 [&_th:first-child]:pl-5 [&_th:last-child]:pr-5`}>
                      <thead>
                        <tr>
                          <th>Contact</th>
                          <th className="!text-right">First click</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.clickers.map((c) => (
                          <tr key={c.email + c.at}>
                            <td className="max-w-0 w-full">
                              <Contact c={c} />
                            </td>
                            <td className="whitespace-nowrap text-right">
                              <div className="text-stone-900">{when(c.at)}</div>
                              {c.count > 1 ? <div className="text-xs text-stone-500">{c.count} clicks</div> : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <Empty>
                  Nobody yet. Clicks from forwarded copies land under &ldquo;Forwarded&rdquo; instead, since they carry no token.
                </Empty>
              )}

              {stats && stats.totalPages > 1 ? (
                <div className="mt-auto">
                  <SheetFooter>
                    <span className="text-stone-500">
                      Page {stats.page} of {stats.totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1 || loading}
                      className={`${btn.small} ml-auto disabled:cursor-not-allowed`}
                    >
                      <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(stats.totalPages, p + 1))}
                      disabled={page >= stats.totalPages || loading}
                      className="inline-flex h-8 items-center gap-1 rounded-full bg-stone-900 px-3 text-[13px] text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  </SheetFooter>
                </div>
              ) : null}
            </Sheet>
          </div>
        </>
      )}
    </OwnLayout>
  );
}
