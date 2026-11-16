"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { CalendarX, Check, ChevronRight, Clock, Info, Lock, Pencil, PlusCircle, ShieldCheck, Store, Trash2, type LucideIcon } from "lucide-react";
import { OwnLayout, PageHead, Seg, Sheet, StatTile, Tag, btn, field, DateField } from "@/components/admin/ui";

interface AddOn {
  id: string;
  name: string;
  description: string;
  pricePence: number;
  isActive: boolean;
}

interface BookingPolicy {
  id: string;
  locationId: string | null;
  locationName: string;
  minPartySize: number;
  maxPartySize: number;
  depositThreshold: number;
  depositAmountPence: number;
  cancellationWindowH: number;
  maxAdvanceDays: number;
}

interface BlackoutDate {
  id: string;
  date: string;
  reason: string;
  locationId: string | null;
  location: { name: string } | null;
  fromTime: string | null;
  toTime: string | null;
}

interface Location {
  id: string;
  name: string;
  slug: string;
}

type Tab = "policies" | "addons" | "blackouts" | "timeslots" | "password";

const TABS: { key: Tab; label: string; sub: string; intro: string; icon: LucideIcon }[] = [
  { key: "policies", label: "Booking policies", sub: "Party size, deposits, cancel window", intro: "One set of rules for each location", icon: ShieldCheck },
  { key: "timeslots", label: "Time slots", sub: "When each location takes bookings", intro: "When each location takes bookings, day by day", icon: Clock },
  { key: "addons", label: "Add-ons", sub: "Extras guests can add to a booking", intro: "Extras guests can add to a booking", icon: PlusCircle },
  { key: "blackouts", label: "Blackout dates", sub: "Days or hours closed to bookings", intro: "Days or hours closed to bookings", icon: CalendarX },
  { key: "password", label: "Password", sub: "Change the admin password", intro: "Change the admin password", icon: Lock },
];

/* Small shared bits for this page */
const label = "mb-1.5 ml-1 block text-xs text-stone-500";
const card = "rounded-[20px] border border-sand-300 p-4 md:p-5";
const smallPrimary =
  "inline-flex h-8 items-center gap-1 rounded-full bg-honey-300 px-3 text-[13px] font-medium text-ink-900 transition hover:bg-honey-200 disabled:opacity-50";
const iconDelete =
  "inline-flex h-8 w-8 items-center justify-center rounded-full text-red-700 transition hover:bg-red-50";

function CardTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <h3 className="text-base font-normal text-stone-900">{children}</h3>
      {aside && <div className="ml-auto flex items-center gap-2">{aside}</div>}
    </div>
  );
}

function ActiveToggle({ active, onClick, offLabel }: { active: boolean; onClick: () => void; offLabel: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-8 items-center rounded-full px-3 text-xs transition ${
        active ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-sand-200 text-stone-500 hover:bg-sand-300"
      }`}
    >
      {active ? "Active" : offLabel}
    </button>
  );
}

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<Tab>("policies");
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState<BookingPolicy[]>([]);
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [blackoutDates, setBlackoutDates] = useState<BlackoutDate[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/settings");
    const data = await res.json();
    setPolicies(data.policies || []);
    setAddOns(data.addOns || []);
    setBlackoutDates(data.blackoutDates || []);
    setLocations(data.locations || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const current = TABS.find((t) => t.key === tab) || TABS[0];

  return (
    <OwnLayout>
      <PageHead title="Settings" subtitle="Booking rules, time slots, add-ons, blackout dates and your password" />

      {loading ? (
        <div className="flex h-64 items-center justify-center font-light text-white/85">Loading settings...</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
          {/* Section list: a sheet on desktop, a switch or a menu on smaller screens */}
          <Sheet label="Settings sections" className="hidden px-2.5 pb-2.5 pt-4 lg:sticky lg:top-[96px] lg:block">
            <nav aria-label="Settings sections">
              <div className="px-3 pb-2.5 text-xs text-stone-500">Sections</div>
              <div className="flex flex-col gap-1">
                {TABS.map((t) => {
                  const on = tab === t.key;
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTab(t.key)}
                      aria-current={on ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-[18px] px-3 py-2.5 text-left transition ${
                        on ? "bg-honey-300 text-ink-900" : "text-stone-900 hover:bg-sand-100"
                      }`}
                    >
                      <span className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full ${on ? "bg-white/45" : "bg-sand-200"}`}>
                        <Icon className="h-5 w-5" strokeWidth={1.5} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm">{t.label}</span>
                        <span className={`mt-px block truncate text-xs ${on ? "text-ink-900/70" : "text-stone-500"}`}>{t.sub}</span>
                      </span>
                      {!on && <ChevronRight className="ml-auto h-[18px] w-[18px] shrink-0 opacity-60" strokeWidth={1.5} />}
                    </button>
                  );
                })}
              </div>
            </nav>
          </Sheet>

          <div className="lg:hidden">
            <div className="hidden md:block">
              <div className="inline-flex rounded-full bg-sand-50 p-1">
                <Seg label="Settings sections" options={TABS.map((t) => ({ value: t.key, label: t.label }))} value={tab} onChange={setTab} />
              </div>
            </div>
            <label className="md:hidden">
              <span className="sr-only">Settings section</span>
              <select value={tab} onChange={(e) => setTab(e.target.value as Tab)} className={field}>
                {TABS.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <Sheet label={current.label} className="min-w-0 p-4 md:px-[22px] md:py-5">
            <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="font-outfit text-xl font-normal tracking-tight text-stone-900">{current.label}</h2>
              <span className="text-[13px] font-light text-stone-500">{current.intro}</span>
            </div>

            {tab === "policies" && <PoliciesPanel policies={policies} onRefresh={fetchSettings} />}
            {tab === "timeslots" && <TimeSlotsPanel locations={locations} />}
            {tab === "addons" && <AddOnsPanel addOns={addOns} onRefresh={fetchSettings} />}
            {tab === "blackouts" && <BlackoutsPanel blackoutDates={blackoutDates} locations={locations} onRefresh={fetchSettings} />}
            {tab === "password" && <PasswordPanel />}
          </Sheet>
        </div>
      )}
    </OwnLayout>
  );
}

/* ──── Policies Panel ──── */
function PoliciesPanel({
  policies,
  onRefresh,
}: {
  policies: BookingPolicy[];
  onRefresh: () => void;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<BookingPolicy>>({});
  const [saving, setSaving] = useState(false);

  function startEdit(p: BookingPolicy) {
    setEditId(p.id);
    setForm({
      minPartySize: p.minPartySize,
      maxPartySize: p.maxPartySize,
      depositThreshold: p.depositThreshold,
      depositAmountPence: p.depositAmountPence,
      cancellationWindowH: p.cancellationWindowH,
      maxAdvanceDays: p.maxAdvanceDays,
    });
  }

  async function savePolicy() {
    setSaving(true);
    await fetch("/api/admin/settings/policies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editId, ...form }),
    });
    setSaving(false);
    setEditId(null);
    onRefresh();
  }

  const money = (pence: number) => `£${(pence / 100).toFixed(2)}`;

  return (
    <div className="space-y-3.5">
      {policies.map((p) => {
        const editing = editId === p.id;
        return (
          <div key={p.id} className={editing ? "rounded-[20px] border-[1.5px] border-sand-300 bg-sand-200 p-4 md:p-5" : card}>
            <div className="mb-3.5 flex items-center gap-2.5">
              <Store className={`h-5 w-5 ${editing ? "text-stone-900" : "text-stone-500"}`} strokeWidth={1.5} />
              <h3 className="text-base font-normal text-stone-900">{p.locationName}</h3>
              {editing ? (
                <Tag tone="gold">Editing</Tag>
              ) : (
                <button type="button" onClick={() => startEdit(p)} className={`${btn.small} ml-auto`}>
                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Edit
                </button>
              )}
            </div>

            {editing ? (
              <>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 md:grid-cols-3">
                  {[
                    { key: "minPartySize", label: "Min party" },
                    { key: "maxPartySize", label: "Max party" },
                    { key: "depositThreshold", label: "Deposit threshold" },
                    { key: "depositAmountPence", label: "Deposit (pence)" },
                    { key: "cancellationWindowH", label: "Cancel window (hrs)" },
                    { key: "maxAdvanceDays", label: "Max advance days" },
                  ].map(({ key, label: l }) => (
                    <label key={key} className="block min-w-0">
                      <span className={label}>{l}</span>
                      <input
                        type="number"
                        value={((form as Record<string, unknown>)[key] as number) || 0}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            [key]: parseInt(e.target.value) || 0,
                          }))
                        }
                        className={field}
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" onClick={() => setEditId(null)} className={btn.light}>
                    Cancel
                  </button>
                  <button type="button" onClick={savePolicy} disabled={saving} className={`${btn.primary} !h-10`}>
                    <Check className="h-4 w-4" strokeWidth={2} />
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                <StatTile label="Party size" value={`${p.minPartySize} to ${p.maxPartySize}`} />
                <StatTile label="Deposit threshold" value={`${p.depositThreshold}+ guests`} />
                <StatTile label="Deposit amount" value={money(p.depositAmountPence)} />
                <StatTile label="Cancel window" value={`${p.cancellationWindowH}h`} />
                <StatTile label="Max advance" value={`${p.maxAdvanceDays} days`} />
              </div>
            )}
          </div>
        );
      })}

      {policies.length > 0 && (
        <div className="rounded-[20px] bg-sand-100 px-4 py-3 md:px-[18px]">
          <div className="flex items-center gap-2 text-sm text-stone-900">
            <Info className="h-[18px] w-[18px] text-stone-500" strokeWidth={1.5} />
            In plain words
          </div>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-[26px] text-[13px] leading-relaxed text-stone-600">
            {policies.map((p) => (
              <li key={p.id}>
                {p.locationName}: tables of {p.minPartySize} to {p.maxPartySize}, up to {p.maxAdvanceDays} days ahead. {p.depositThreshold} or more pay a{" "}
                {money(p.depositAmountPence)} deposit. Guests can cancel up to {p.cancellationWindowH} hours before.
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ──── Add-ons Panel ──── */
function AddOnsPanel({
  addOns,
  onRefresh,
}: {
  addOns: AddOn[];
  onRefresh: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", pricePence: 0 });

  async function createAddOn(e: React.FormEvent) {
    e.preventDefault();
    if (!newName || !newPrice) return;
    setCreating(true);
    await fetch("/api/admin/settings/addons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        description: newDesc,
        pricePence: Math.round(parseFloat(newPrice) * 100),
      }),
    });
    setCreating(false);
    setNewName("");
    setNewDesc("");
    setNewPrice("");
    onRefresh();
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch("/api/admin/settings/addons", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    onRefresh();
  }

  function startEdit(a: AddOn) {
    setEditId(a.id);
    setEditForm({ name: a.name, description: a.description, pricePence: a.pricePence });
  }

  async function saveEdit() {
    if (!editId) return;
    await fetch("/api/admin/settings/addons", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editId, ...editForm }),
    });
    setEditId(null);
    onRefresh();
  }

  async function deleteAddOn(id: string) {
    await fetch("/api/admin/settings/addons", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    onRefresh();
  }

  return (
    <div className="space-y-3.5">
      {/* Existing add-ons */}
      <div className="overflow-hidden rounded-[20px] border border-sand-300">
        <div className="flex items-center px-4 py-3 md:px-5">
          <h3 className="text-base font-normal text-stone-900">Current add-ons</h3>
          <span className="ml-2 text-[13px] text-stone-500">{addOns.length}</span>
        </div>
        {addOns.length === 0 ? (
          <p className="border-t border-sand-200 px-5 py-8 text-center text-sm font-light text-stone-500">No add-ons yet</p>
        ) : (
          addOns.map((a) => (
            <div key={a.id} className="border-t border-sand-200 px-4 py-3 md:px-5">
              {editId === a.id ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_120px]">
                    <label className="block min-w-0">
                      <span className={label}>Name</span>
                      <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={field} />
                    </label>
                    <label className="block min-w-0">
                      <span className={label}>Description</span>
                      <input
                        type="text"
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className={field}
                      />
                    </label>
                    <label className="block min-w-0">
                      <span className={label}>Price (£)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={(editForm.pricePence / 100).toFixed(2)}
                        onChange={(e) => setEditForm({ ...editForm, pricePence: Math.round(parseFloat(e.target.value || "0") * 100) })}
                        className={field}
                      />
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEditId(null)} className={btn.small}>
                      Cancel
                    </button>
                    <button type="button" onClick={saveEdit} className={smallPrimary}>
                      <Check className="h-3.5 w-3.5" strokeWidth={2} />
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <p className={`text-[15px] ${a.isActive ? "text-stone-900" : "text-stone-500 line-through"}`}>{a.name}</p>
                    {a.description && <p className="text-xs text-stone-500">{a.description}</p>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="mr-1 text-sm tabular-nums text-stone-900">£{(a.pricePence / 100).toFixed(2)}</span>
                    <button type="button" onClick={() => startEdit(a)} className={btn.small}>
                      <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Edit
                    </button>
                    <ActiveToggle active={a.isActive} onClick={() => toggleActive(a.id, a.isActive)} offLabel="Inactive" />
                    <button type="button" onClick={() => deleteAddOn(a.id)} aria-label={`Delete ${a.name}`} title="Delete" className={iconDelete}>
                      <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create new add-on */}
      <div className={card}>
        <CardTitle>Add new</CardTitle>
        <form onSubmit={createAddOn} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_120px_auto] sm:items-end">
          <label className="block min-w-0">
            <span className={label}>Name</span>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} required className={field} placeholder="Birthday Cake" />
          </label>
          <label className="block min-w-0">
            <span className={label}>Description</span>
            <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className={field} placeholder="Custom celebration cake" />
          </label>
          <label className="block min-w-0">
            <span className={label}>Price (£)</span>
            <input type="number" step="0.01" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} required className={field} placeholder="15.00" />
          </label>
          <button type="submit" disabled={creating} className={`${btn.primary} justify-center`}>
            {creating ? "Adding..." : "Add"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ──── Blackout Dates Panel ──── */
function BlackoutsPanel({
  blackoutDates,
  locations,
  onRefresh,
}: {
  blackoutDates: BlackoutDate[];
  locations: Location[];
  onRefresh: () => void;
}) {
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");
  const [newLocation, setNewLocation] = useState("");
  // Optional window. Both empty = block the whole day.
  const [newFrom, setNewFrom] = useState("");
  const [newTo, setNewTo] = useState("");
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);

  async function createBlackout(e: React.FormEvent) {
    e.preventDefault();
    if (!newDate || !newReason) return;
    setCreating(true);
    setFormError("");
    try {
      const res = await fetch("/api/admin/settings/blackout-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: newDate,
          reason: newReason,
          locationId: newLocation || null,
          fromTime: newFrom,
          toTime: newTo,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setFormError(d.error || "Could not add the blackout");
        return;
      }
      setNewDate("");
      setNewReason("");
      setNewLocation("");
      setNewFrom("");
      setNewTo("");
      onRefresh();
    } finally {
      setCreating(false);
    }
  }

  async function deleteBlackout(id: string) {
    await fetch("/api/admin/settings/blackout-dates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    onRefresh();
  }

  return (
    <div className="space-y-3.5">
      {/* Existing blackout dates */}
      <div className="overflow-hidden rounded-[20px] border border-sand-300">
        <div className="flex items-center px-4 py-3 md:px-5">
          <h3 className="text-base font-normal text-stone-900">Blackout dates</h3>
          <span className="ml-2 text-[13px] text-stone-500">{blackoutDates.length}</span>
        </div>
        {blackoutDates.length === 0 ? (
          <p className="border-t border-sand-200 px-5 py-8 text-center text-sm font-light text-stone-500">No blackout dates set</p>
        ) : (
          blackoutDates.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-sand-200 px-4 py-3 md:px-5">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5">
                <span className="text-sm tabular-nums text-stone-900">{b.date}</span>
                {b.fromTime && b.toTime ? (
                  <Tag tone="gold">
                    <span className="tabular-nums">
                      {b.fromTime} to {b.toTime}
                    </span>
                  </Tag>
                ) : (
                  <Tag tone="off">Whole day</Tag>
                )}
                <span className="text-sm text-stone-600">{b.reason}</span>
                {b.location && <span className="text-xs text-stone-500">({b.location.name})</span>}
                {!b.locationId && <Tag tone="wait">All locations</Tag>}
              </div>
              <button type="button" onClick={() => deleteBlackout(b.id)} className={`${btn.small} !text-red-700 hover:!border-red-200 hover:bg-red-50`}>
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add new blackout */}
      <div className={card}>
        <h3 className="text-base font-normal text-stone-900">Add a blackout</h3>
        <p className="mb-3.5 mt-1 text-xs leading-relaxed text-stone-500">
          Leave From and To empty to block the whole day. Set them to block only those arrival times: 19:00 to 21:00 blocks 19:00, 19:30, 20:00 and 20:30,
          and 21:00 stays bookable.
        </p>
        <form onSubmit={createBlackout} className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)_120px_120px] xl:items-end">
          <label className="block min-w-0">
            <span className={label}>Date</span>
            <DateField value={newDate} onChange={setNewDate} />
          </label>
          <label className="block min-w-0">
            <span className={label}>Reason</span>
            <input type="text" value={newReason} onChange={(e) => setNewReason(e.target.value)} required className={field} placeholder="Private event" />
          </label>
          <label className="col-span-2 block min-w-0 md:col-span-1">
            <span className={label}>Location</span>
            <select value={newLocation} onChange={(e) => setNewLocation(e.target.value)} className={field}>
              <option value="">All Locations</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <span className={label}>From (optional)</span>
            <input type="time" step={1800} value={newFrom} onChange={(e) => setNewFrom(e.target.value)} className={field} />
          </label>
          <label className="block min-w-0">
            <span className={label}>To (optional)</span>
            <input type="time" step={1800} value={newTo} onChange={(e) => setNewTo(e.target.value)} className={field} />
          </label>
          <div className="col-span-2 flex justify-end md:col-span-3 xl:col-span-5">
            <button type="submit" disabled={creating} className={btn.primary}>
              {creating ? "Adding..." : newFrom || newTo ? "Block these times" : "Block whole day"}
            </button>
          </div>
        </form>
        {formError && <p className="mt-3 rounded-2xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{formError}</p>}
      </div>
    </div>
  );
}

/* ──── Time Slots Panel ──── */
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface TimeSlotRow {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  maxCovers: number;
  isActive: boolean;
  location: { name: string; slug: string };
}

function TimeSlotsPanel({ locations }: { locations: Location[] }) {
  const [slots, setSlots] = useState<TimeSlotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLoc, setFilterLoc] = useState(locations[0]?.id || "");
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ startTime: "", endTime: "", maxCovers: 30 });

  // New slot form
  const [newDay, setNewDay] = useState(1);
  const [newStart, setNewStart] = useState("12:00");
  const [newEnd, setNewEnd] = useState("14:30");
  const [newCovers, setNewCovers] = useState(30);
  const [creating, setCreating] = useState(false);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/settings/time-slots?location=${filterLoc}`);
    const data = await res.json();
    setSlots(data.slots || []);
    setLoading(false);
  }, [filterLoc]);

  useEffect(() => {
    if (filterLoc) fetchSlots();
  }, [filterLoc, fetchSlots]);

  async function toggleActive(id: string, isActive: boolean) {
    await fetch("/api/admin/settings/time-slots", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    fetchSlots();
  }

  async function saveEdit() {
    await fetch("/api/admin/settings/time-slots", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing, ...editForm }),
    });
    setEditing(null);
    fetchSlots();
  }

  async function deleteSlot(id: string) {
    await fetch("/api/admin/settings/time-slots", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchSlots();
  }

  async function createSlot(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    await fetch("/api/admin/settings/time-slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationId: filterLoc,
        dayOfWeek: newDay,
        startTime: newStart,
        endTime: newEnd,
        maxCovers: newCovers,
      }),
    });
    setCreating(false);
    fetchSlots();
  }

  // Group slots by day
  const byDay: Record<number, TimeSlotRow[]> = {};
  for (const s of slots) {
    const d = s.dayOfWeek ?? 0;
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(s);
  }

  const small = "h-9 rounded-full border border-sand-300 bg-sand-100 px-3 text-sm text-stone-900 outline-none focus:border-stone-500 focus:bg-sand-50 [color-scheme:light]";

  return (
    <div className="space-y-3.5">
      {/* Location filter */}
      {locations.length > 0 && (
        <Seg label="Location" options={locations.map((l) => ({ value: l.id, label: l.name }))} value={filterLoc} onChange={setFilterLoc} />
      )}

      {loading ? (
        <div className="py-8 text-center text-sm font-light text-stone-500">Loading time slots...</div>
      ) : (
        <div className="overflow-hidden rounded-[20px] border border-sand-300">
          {[1, 2, 3, 4, 5, 6, 0].map((day, i) => {
            const daySlots = byDay[day] || [];
            return (
              <div key={day} className={`grid gap-x-4 gap-y-1 px-4 py-3 md:grid-cols-[80px_minmax(0,1fr)] md:px-5 ${i > 0 ? "border-t border-sand-200" : ""}`}>
                <div className="flex items-baseline gap-2 md:block md:pt-1.5">
                  <h4 className="text-[15px] text-stone-900">{DAY_NAMES[day]}</h4>
                  <span className="text-xs text-stone-500">
                    {daySlots.length} slot{daySlots.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {daySlots.length === 0 ? (
                  <div className="py-1.5 text-sm font-light text-stone-500">No slots</div>
                ) : (
                  <div className="divide-y divide-sand-200">
                    {daySlots.map((s) => (
                      <div key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-1.5">
                        {editing === s.id ? (
                          <div className="flex flex-1 flex-wrap items-center gap-2">
                            <input
                              type="time"
                              aria-label="Start"
                              value={editForm.startTime}
                              onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                              className={small}
                            />
                            <span className="text-sm text-stone-500">to</span>
                            <input
                              type="time"
                              aria-label="End"
                              value={editForm.endTime}
                              onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                              className={small}
                            />
                            <input
                              type="number"
                              aria-label="Covers"
                              value={editForm.maxCovers}
                              onChange={(e) => setEditForm({ ...editForm, maxCovers: parseInt(e.target.value) || 0 })}
                              className={`${small} w-20`}
                              placeholder="Covers"
                            />
                            <button type="button" onClick={() => setEditing(null)} className={btn.small}>
                              Cancel
                            </button>
                            <button type="button" onClick={saveEdit} className={smallPrimary}>
                              <Check className="h-3.5 w-3.5" strokeWidth={2} />
                              Save
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex min-w-0 flex-1 items-baseline gap-3">
                              <span className={`text-sm tabular-nums ${s.isActive ? "text-stone-900" : "text-stone-500 line-through"}`}>
                                {s.startTime} to {s.endTime}
                              </span>
                              <span className="text-xs text-stone-500">{s.maxCovers} covers</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditing(s.id);
                                  setEditForm({ startTime: s.startTime, endTime: s.endTime, maxCovers: s.maxCovers });
                                }}
                                className={btn.small}
                              >
                                <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                                Edit
                              </button>
                              <ActiveToggle active={s.isActive} onClick={() => toggleActive(s.id, s.isActive)} offLabel="Off" />
                              <button type="button" onClick={() => deleteSlot(s.id)} aria-label={`Delete ${s.startTime} slot`} title="Delete" className={iconDelete}>
                                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add new slot */}
      <div className={card}>
        <CardTitle>Add a time slot</CardTitle>
        <form onSubmit={createSlot} className="grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
          <label className="block min-w-0">
            <span className={label}>Day</span>
            <select value={newDay} onChange={(e) => setNewDay(Number(e.target.value))} className={field}>
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <option key={d} value={d}>
                  {DAY_NAMES[d]}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <span className={label}>Start</span>
            <input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} className={field} />
          </label>
          <label className="block min-w-0">
            <span className={label}>End</span>
            <input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} className={field} />
          </label>
          <label className="block min-w-0">
            <span className={label}>Max covers</span>
            <input type="number" value={newCovers} onChange={(e) => setNewCovers(parseInt(e.target.value) || 0)} className={field} />
          </label>
          <button type="submit" disabled={creating} className={`${btn.primary} col-span-2 justify-center md:col-span-1`}>
            {creating ? "Adding..." : "Add slot"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ──── Password Panel ──── */
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
      const res = await fetch("/api/admin/password", {
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
    <div className={`${card} max-w-md`}>
      <CardTitle>Change password</CardTitle>

      {message && (
        <div className={`mb-4 rounded-2xl px-4 py-2.5 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <label className="block">
          <span className={label}>Current password</span>
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className={field} />
        </label>
        <label className="block">
          <span className={label}>New password</span>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} className={field} />
        </label>
        <label className="block">
          <span className={label}>Confirm new password</span>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} className={field} />
        </label>
        <button type="submit" disabled={saving} className={`${btn.primary} w-full justify-center`}>
          {saving ? "Updating..." : "Update password"}
        </button>
      </form>
    </div>
  );
}
