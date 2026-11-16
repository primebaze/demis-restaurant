"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Download, Link as LinkIcon, ListFilter, Plus, TriangleAlert, X } from "lucide-react";
import { Empty, OwnLayout, PageHead, Sheet, SheetFooter, SheetTitle, Tag, btn, field, fieldArea, table, tableWrap, DateField } from "@/components/admin/ui";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.demisrestaurant.co.uk";

type Selection = {
  id: string;
  guestName: string;
  appetiser: string;
  starter: string;
  main: string;
  protein: string;
  dessert: string;
  allergies: string;
  createdAt: string;
};

type Group = {
  id: string;
  groupCode: string;
  organizerName: string;
  organizerEmail: string;
  organizerPhone: string;
  date: string;
  partySize: number;
  locationSlug: string;
  notes: string;
  status: string;
  createdAt: string;
  selections: Selection[];
};

const LOCATIONS: Record<string, string> = {
  cricklewood: "Cricklewood",
  streatham: "Streatham Hill",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminSetMenuPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // New group form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    organizerName: "",
    organizerEmail: "",
    organizerPhone: "",
    date: "",
    partySize: "",
    locationSlug: "cricklewood",
    notes: "",
  });
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);
  const [newGroupResult, setNewGroupResult] = useState<{ groupCode: string; guestSelectionUrl: string } | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    params.set("page", String(page));
    const res = await fetch(`/api/admin/set-menu/groups?${params}`);
    const data = await res.json();
    setGroups(data.groups || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  }, [filterStatus, page]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  async function createGroup() {
    setFormError("");
    if (!form.organizerName.trim()) { setFormError("Organiser name is required"); return; }
    if (!form.date) { setFormError("Date is required"); return; }
    if (!form.partySize || parseInt(form.partySize) < 1) { setFormError("Party size must be at least 1"); return; }

    setCreating(true);
    try {
      const res = await fetch("/api/admin/set-menu/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          partySize: parseInt(form.partySize),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to create group");
      } else {
        setNewGroupResult({ groupCode: data.group.groupCode, guestSelectionUrl: data.guestSelectionUrl });
        setForm({ organizerName: "", organizerEmail: "", organizerPhone: "", date: "", partySize: "", locationSlug: "cricklewood", notes: "" });
        fetchGroups();
      }
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleStatus(id: string, currentStatus: string) {
    setToggling(id);
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    await fetch(`/api/admin/set-menu/groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setToggling(null);
    fetchGroups();
  }

  function copyLink(url: string, code: string) {
    navigator.clipboard.writeText(url);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  async function exportGroupPdf(group: Group) {
    setExporting(group.id);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(16);
      doc.text(`Set Menu — ${group.groupCode}`, 14, 16);
      doc.setFontSize(10);
      doc.setTextColor(120);
      const loc = LOCATIONS[group.locationSlug] || group.locationSlug;
      doc.text(
        `${group.organizerName} · ${formatDate(group.date)} · ${loc} · ${group.selections.length}/${group.partySize} guests`,
        14,
        23
      );

      autoTable(doc, {
        startY: 28,
        head: [["#", "Guest", "Appetiser", "Starter", "Main", "Protein", "Dessert", "Allergies"]],
        body: group.selections.map((s, i) => [
          i + 1,
          s.guestName,
          s.appetiser,
          s.starter,
          s.main,
          s.protein,
          s.dessert,
          s.allergies || "—",
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [26, 26, 26], textColor: [232, 204, 156] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      // Appetiser summary
      const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 28;
      const summary = ["Puff Puff", "Samosa", "Spring Rolls"]
        .map((a) => `${a}: ${group.selections.filter((s) => s.appetiser.includes(a)).length}`)
        .join("    ");
      doc.setFontSize(10);
      doc.setTextColor(60);
      doc.text(`Appetiser totals — ${summary}`, 14, finalY + 10);

      doc.save(`demis-set-menu-${group.groupCode}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setExporting(null);
    }
  }

  const labelCls = "mb-1.5 block px-1 text-xs font-light text-stone-500";
  const appetiserTotals = (g: Group) =>
    ["Puff Puff", "Samosa", "Spring Rolls"].map((a) => ({ name: a, count: g.selections.filter((s) => s.appetiser.includes(a)).length }));

  function progress(g: Group) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[15px] text-stone-900">{g.selections.length}</span>
        <span className="text-xs text-stone-500">/ {g.partySize}</span>
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-stone-100">
          <div
            className={`h-full rounded-full ${g.status === "active" ? "bg-ember-400" : "bg-stone-400"}`}
            style={{ width: `${Math.min(100, (g.selections.length / g.partySize) * 100)}%` }}
          />
        </div>
      </div>
    );
  }

  function toggleBtn(g: Group) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); toggleStatus(g.id, g.status); }}
        disabled={toggling === g.id}
        className={btn.small}
      >
        {toggling === g.id ? "…" : g.status === "active" ? "Deactivate" : "Activate"}
      </button>
    );
  }

  function copyBtn(g: Group, guestUrl: string) {
    return (
      <button onClick={(e) => { e.stopPropagation(); copyLink(guestUrl, g.groupCode); }} className={btn.small}>
        {copied === g.groupCode ? <Check className="h-3.5 w-3.5 text-emerald-700" strokeWidth={2} /> : <LinkIcon className="h-3.5 w-3.5" strokeWidth={1.75} />}
        {copied === g.groupCode ? "Copied!" : "Copy link"}
      </button>
    );
  }

  function allergyTag(a: string) {
    return a ? (
      <Tag tone="wait">
        <TriangleAlert className="h-3 w-3" strokeWidth={2} />
        {a}
      </Tag>
    ) : (
      <span className="text-stone-500">None</span>
    );
  }

  /** Organiser details, guest selections and appetiser totals, shown when a group is opened. */
  function groupDetail(g: Group) {
    return (
      <div className="rounded-[18px] bg-white p-4 text-stone-900 md:px-5" onClick={(e) => e.stopPropagation()}>
        {/* Organiser details */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-b border-stone-100 pb-4 md:flex md:flex-wrap md:gap-x-10">
          {[
            ["Email", g.organizerEmail || "Not given"],
            ["Phone", g.organizerPhone || "Not given"],
            ["Created", new Date(g.createdAt).toLocaleDateString("en-GB")],
          ].map(([l, v]) => (
            <div key={l} className="min-w-0">
              <div className="text-[11px] font-light text-stone-500">{l}</div>
              <div className="mt-0.5 break-words text-[13px]">{v}</div>
            </div>
          ))}
          {g.notes && (
            <div className="col-span-2 min-w-0">
              <div className="text-[11px] font-light text-stone-500">Notes</div>
              <div className="mt-0.5 text-[13px]">{g.notes}</div>
            </div>
          )}
        </div>

        {/* Guest selections */}
        <div className="mt-4 flex items-center gap-2">
          <h3 className="text-[15px]">Guest selections</h3>
          <span className="text-xs font-light text-stone-500">{g.selections.length} so far</span>
          {g.selections.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); exportGroupPdf(g); }}
              disabled={exporting === g.id}
              className={`${btn.small} ml-auto`}
            >
              <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
              {exporting === g.id ? "Exporting…" : "Export PDF"}
            </button>
          )}
        </div>
        {g.selections.length === 0 ? (
          <p className="py-4 text-sm font-light text-stone-500">No selections yet</p>
        ) : (
          <>
            <div className={`mt-2 hidden md:block ${tableWrap}`}>
              <table className={`${table} text-[13px]`}>
                <thead>
                  <tr>
                    <th className="w-8"><span className="sr-only">Number</span></th>
                    <th>Guest</th>
                    <th>Appetiser</th>
                    <th>Starter</th>
                    <th>Main</th>
                    <th>Protein</th>
                    <th>Dessert</th>
                    <th>Allergies</th>
                  </tr>
                </thead>
                <tbody>
                  {g.selections.map((s, i) => (
                    <tr key={s.id}>
                      <td className="text-stone-500">{i + 1}.</td>
                      <td>{s.guestName}</td>
                      <td><Tag tone="gold">{s.appetiser}</Tag></td>
                      <td>{s.starter}</td>
                      <td>{s.main}</td>
                      <td>{s.protein}</td>
                      <td>{s.dessert}</td>
                      <td>{allergyTag(s.allergies)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mt-2 space-y-2 md:hidden">
              {g.selections.map((s, i) => (
                <li key={s.id} className="rounded-[16px] bg-stone-50 px-3.5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-500">{i + 1}.</span>
                    <span className="text-sm">{s.guestName}</span>
                    <span className="ml-auto"><Tag tone="gold">{s.appetiser}</Tag></span>
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-stone-500">
                    <span>Starter: <span className="text-stone-800">{s.starter}</span></span>
                    <span>Main: <span className="text-stone-800">{s.main}</span></span>
                    <span>Protein: <span className="text-stone-800">{s.protein}</span></span>
                    <span>Dessert: <span className="text-stone-800">{s.dessert}</span></span>
                  </div>
                  {s.allergies && <div className="mt-2">{allergyTag(s.allergies)}</div>}
                </li>
              ))}
            </ul>

            {/* Appetiser summary */}
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-stone-100 pt-3 text-[13px]">
              <span className="font-light text-stone-500">Appetisers</span>
              {appetiserTotals(g).map((a) => (
                <span key={a.name}>
                  {a.name} <b className="font-medium">{a.count}</b>
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <OwnLayout>
      <PageHead
        title="Set Menu"
        subtitle="Groups where each guest picks their own courses"
        actions={
          <>
            <label className="relative">
              <span className="sr-only">Status</span>
              <ListFilter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white" strokeWidth={1.5} />
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                className={`${btn.glass} appearance-none pl-10 pr-10`}
              >
                <option className="text-stone-900" value="">All statuses</option>
                <option className="text-stone-900" value="active">Active</option>
                <option className="text-stone-900" value="inactive">Inactive</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white" strokeWidth={1.5} />
            </label>
            {filterStatus && (
              <button onClick={() => { setFilterStatus(""); setPage(1); }} className={btn.glass}>
                Clear
              </button>
            )}
            <button onClick={() => { setShowForm(true); setNewGroupResult(null); }} className={btn.primary}>
              <Plus className="h-[18px] w-[18px]" strokeWidth={1.75} />
              New group
            </button>
          </>
        }
      />

      {/* New group form */}
      {showForm && (
        <Sheet label="New set menu group" className="mb-4 p-5 md:p-6">
          <SheetTitle
            aside={
              <button
                onClick={() => { setShowForm(false); setFormError(""); setNewGroupResult(null); }}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-600 hover:text-stone-900"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            }
          >
            Create set menu group
          </SheetTitle>
          <p className="mt-0.5 text-[13px] font-light text-stone-500">A shareable guest selection link will be generated automatically.</p>

          {newGroupResult ? (
            <div className="mt-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-900">
                  <Check className="h-5 w-5" strokeWidth={2} />
                </span>
                <div>
                  <p className="text-sm text-stone-900">Group {newGroupResult.groupCode} created</p>
                  <p className="text-xs font-light text-stone-500">Share the link below with the organiser</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 py-1.5 pl-4 pr-1.5">
                <span className="flex-1 truncate font-mono text-sm text-stone-700">{newGroupResult.guestSelectionUrl}</span>
                <button onClick={() => copyLink(newGroupResult.guestSelectionUrl, newGroupResult.groupCode)} className={`${btn.small} shrink-0`}>
                  <LinkIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {copied === newGroupResult.groupCode ? "Copied!" : "Copy"}
                </button>
              </div>
              <button onClick={() => { setShowForm(false); setNewGroupResult(null); }} className={`${btn.light} mt-4`}>
                Close
              </button>
            </div>
          ) : (
            <div className="mt-5">
              <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className={labelCls}>Organiser name *</label>
                  <input type="text" value={form.organizerName} onChange={(e) => setForm(f => ({ ...f, organizerName: e.target.value }))} placeholder="Full name" className={field} />
                </div>
                <div>
                  <label className={labelCls}>Organiser email</label>
                  <input type="email" value={form.organizerEmail} onChange={(e) => setForm(f => ({ ...f, organizerEmail: e.target.value }))} placeholder="email@example.com" className={field} />
                </div>
                <div>
                  <label className={labelCls}>Organiser phone</label>
                  <input type="tel" value={form.organizerPhone} onChange={(e) => setForm(f => ({ ...f, organizerPhone: e.target.value }))} placeholder="07700 000000" className={field} />
                </div>
                <div>
                  <label className={labelCls}>Event date *</label>
                  <DateField value={form.date} onChange={(v) => setForm(f => ({ ...f, date: v }))} />
                </div>
                <div>
                  <label className={labelCls}>Expected party size *</label>
                  <input type="number" min="1" value={form.partySize} onChange={(e) => setForm(f => ({ ...f, partySize: e.target.value }))} placeholder="e.g. 40" className={field} />
                </div>
                <div>
                  <label className={labelCls}>Location</label>
                  <select value={form.locationSlug} onChange={(e) => setForm(f => ({ ...f, locationSlug: e.target.value }))} className={field}>
                    <option value="cricklewood">Cricklewood</option>
                    <option value="streatham">Streatham Hill</option>
                  </select>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className={labelCls}>Notes (internal)</label>
                  <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any internal notes…" rows={2} className={`${fieldArea} resize-none`} />
                </div>
              </div>

              {formError && (
                <p className="mb-4 rounded-2xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{formError}</p>
              )}

              <div className="flex flex-wrap gap-2">
                <button onClick={createGroup} disabled={creating} className={btn.primary}>
                  {creating ? "Creating…" : "Create group and link"}
                </button>
                <button onClick={() => { setShowForm(false); setFormError(""); }} className={btn.light}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </Sheet>
      )}

      {/* Groups */}
      <Sheet label="Groups" className="overflow-hidden">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 pb-3 pt-4 md:px-5 md:pt-5">
          <h2 className="font-outfit text-[22px] font-normal tracking-tight">Groups</h2>
          <span className="text-[13px] font-light text-stone-500">{total} group{total !== 1 ? "s" : ""}</span>
          <span className="ml-auto hidden text-[13px] font-light text-stone-500 md:inline">Tap a group to see who has chosen what</span>
        </div>

        {loading ? (
          <Empty>Loading groups…</Empty>
        ) : groups.length === 0 ? (
          <Empty>No set menu groups yet</Empty>
        ) : (
          <>
            {/* Table: iPad and desktop */}
            <div className={`hidden md:block ${tableWrap}`}>
              <table className={`${table} [&_td:first-child]:pl-5 [&_th:first-child]:pl-5 [&_td:last-child]:pr-5 [&_th:last-child]:pr-5`}>
                <thead>
                  <tr>
                    <th>Group ID</th>
                    <th>Organiser</th>
                    <th>Date</th>
                    <th>Location</th>
                    <th>Selections</th>
                    <th>Status</th>
                    <th>Toggle</th>
                    <th className="!text-right">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => {
                    const guestUrl = `${SITE_URL}/set-menu/${g.groupCode}`;
                    const isExpanded = expanded === g.id;
                    return (
                      <Fragment key={g.id}>
                        <tr
                          className={`cursor-pointer transition-colors ${isExpanded ? "bg-stone-100" : "hover:bg-stone-50"}`}
                          onClick={() => setExpanded(isExpanded ? null : g.id)}
                          onKeyDown={(e) => { if (e.key === "Enter") setExpanded(isExpanded ? null : g.id); }}
                          tabIndex={0}
                          aria-expanded={isExpanded}
                        >
                          <td className="whitespace-nowrap font-mono text-[13px] text-stone-900">{g.groupCode}</td>
                          <td>
                            <div>{g.organizerName}</div>
                            {g.organizerPhone && <div className="text-xs font-light text-stone-500">{g.organizerPhone}</div>}
                          </td>
                          <td className="whitespace-nowrap">{formatDate(g.date)}</td>
                          <td className="whitespace-nowrap">{LOCATIONS[g.locationSlug] || g.locationSlug}</td>
                          <td>{progress(g)}</td>
                          <td><Tag tone={g.status === "active" ? "ok" : "off"}>{g.status === "active" ? "Active" : "Inactive"}</Tag></td>
                          <td>{toggleBtn(g)}</td>
                          <td className="text-right">{copyBtn(g, guestUrl)}</td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-stone-100">
                            <td colSpan={8} className="!border-t-0 !pb-4 !pt-0">
                              {groupDetail(g)}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Cards: phones */}
            <div className="space-y-2 px-3 pb-3 md:hidden">
              {groups.map((g) => {
                const guestUrl = `${SITE_URL}/set-menu/${g.groupCode}`;
                const isExpanded = expanded === g.id;
                return (
                  <article key={g.id} className={`rounded-[18px] p-3.5 ${isExpanded ? "bg-stone-100" : "bg-stone-50"}`}>
                    <button type="button" onClick={() => setExpanded(isExpanded ? null : g.id)} aria-expanded={isExpanded} className="block w-full text-left">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[15px]">{g.organizerName}</div>
                          <div className="text-xs font-light text-stone-500">
                            <span className="font-mono text-stone-900">{g.groupCode}</span> · {formatDate(g.date)} · {LOCATIONS[g.locationSlug] || g.locationSlug}
                          </div>
                        </div>
                        <Tag tone={g.status === "active" ? "ok" : "off"}>{g.status === "active" ? "Active" : "Inactive"}</Tag>
                      </div>
                      <div className="mt-2.5 flex items-center gap-2">
                        {progress(g)}
                        <ChevronDown className={`ml-auto h-4 w-4 text-stone-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} strokeWidth={1.75} />
                      </div>
                    </button>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {toggleBtn(g)}
                      {copyBtn(g, guestUrl)}
                    </div>
                    {isExpanded && <div className="mt-3">{groupDetail(g)}</div>}
                  </article>
                );
              })}
            </div>
          </>
        )}

        {totalPages > 1 && (
          <SheetFooter>
            <span className="text-stone-500">Page {page} of {totalPages}</span>
            <div className="ml-auto flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className={btn.small}>
                <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-stone-900 px-3 text-[13px] text-white transition hover:bg-black disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          </SheetFooter>
        )}
      </Sheet>
    </OwnLayout>
  );
}
