"use client";

import { useEffect, useState, useCallback } from "react";

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
}

interface Location {
  id: string;
  name: string;
  slug: string;
}

type Tab = "policies" | "addons" | "blackouts";

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

  const TABS: { key: Tab; label: string }[] = [
    { key: "policies", label: "Booking Policies" },
    { key: "addons", label: "Add-ons" },
    { key: "blackouts", label: "Blackout Dates" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#1a1a1a] rounded-xl p-1 border border-gray-800 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.key
                ? "bg-gold-300/10 text-gold-300"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "policies" && (
        <PoliciesPanel policies={policies} onRefresh={fetchSettings} />
      )}
      {tab === "addons" && (
        <AddOnsPanel addOns={addOns} onRefresh={fetchSettings} />
      )}
      {tab === "blackouts" && (
        <BlackoutsPanel
          blackoutDates={blackoutDates}
          locations={locations}
          onRefresh={fetchSettings}
        />
      )}
    </div>
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

  return (
    <div className="space-y-4">
      {policies.map((p) => (
        <div key={p.id} className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">{p.locationName}</h3>
            {editId !== p.id && (
              <button
                onClick={() => startEdit(p)}
                className="px-3 py-1 text-xs text-gold-300 border border-gold-300/30 rounded-lg hover:bg-gold-300/10 transition"
              >
                Edit
              </button>
            )}
          </div>

          {editId === p.id ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { key: "minPartySize", label: "Min Party" },
                { key: "maxPartySize", label: "Max Party" },
                { key: "depositThreshold", label: "Deposit Threshold" },
                { key: "depositAmountPence", label: "Deposit (pence)" },
                { key: "cancellationWindowH", label: "Cancel Window (hrs)" },
                { key: "maxAdvanceDays", label: "Max Advance Days" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 block mb-1">{label}</label>
                  <input
                    type="number"
                    value={(form as Record<string, unknown>)[key] as number || 0}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        [key]: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gold-400"
                  />
                </div>
              ))}
              <div className="flex items-end gap-2 col-span-2 md:col-span-3">
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={savePolicy}
                    disabled={saving}
                    className="px-4 py-2 bg-gold-300 text-black font-medium text-sm rounded-lg hover:bg-gold-400 transition disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    className="px-4 py-2 text-gray-400 text-sm hover:text-white transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500 block text-xs">Party Size</span>
                <span className="text-white">{p.minPartySize} – {p.maxPartySize}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">Deposit Threshold</span>
                <span className="text-white">{p.depositThreshold}+ guests</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">Deposit Amount</span>
                <span className="text-white">£{(p.depositAmountPence / 100).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">Cancel Window</span>
                <span className="text-white">{p.cancellationWindowH}h</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">Max Advance</span>
                <span className="text-white">{p.maxAdvanceDays} days</span>
              </div>
            </div>
          )}
        </div>
      ))}
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

  return (
    <div>
      {/* Existing add-ons */}
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-800">
          <h3 className="text-white font-semibold">Current Add-ons</h3>
        </div>
        <div className="divide-y divide-gray-800">
          {addOns.map((a) => (
            <div key={a.id} className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className={`font-medium ${a.isActive ? "text-white" : "text-gray-500 line-through"}`}>
                  {a.name}
                </p>
                <p className="text-xs text-gray-500">{a.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gold-300">
                  £{(a.pricePence / 100).toFixed(2)}
                </span>
                <button
                  onClick={() => toggleActive(a.id, a.isActive)}
                  className={`px-2 py-1 text-xs rounded border transition ${
                    a.isActive
                      ? "text-green-400 border-green-400/30 hover:bg-green-400/10"
                      : "text-gray-500 border-gray-700 hover:bg-white/5"
                  }`}
                >
                  {a.isActive ? "Active" : "Inactive"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create new add-on */}
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4">Add New</h3>
        <form onSubmit={createAddOn} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              className="px-3 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gold-400"
              placeholder="Birthday Cake"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Description</label>
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="px-3 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gold-400"
              placeholder="Custom celebration cake"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Price (£)</label>
            <input
              type="number"
              step="0.01"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              required
              className="px-3 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white text-sm w-24 focus:outline-none focus:border-gold-400"
              placeholder="15.00"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 bg-gold-300 text-black font-medium text-sm rounded-lg hover:bg-gold-400 transition disabled:opacity-50"
          >
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
  const [creating, setCreating] = useState(false);

  async function createBlackout(e: React.FormEvent) {
    e.preventDefault();
    if (!newDate || !newReason) return;
    setCreating(true);
    await fetch("/api/admin/settings/blackout-dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: newDate,
        reason: newReason,
        locationId: newLocation || null,
      }),
    });
    setCreating(false);
    setNewDate("");
    setNewReason("");
    setNewLocation("");
    onRefresh();
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
    <div>
      {/* Existing blackout dates */}
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-800">
          <h3 className="text-white font-semibold">Blackout Dates</h3>
        </div>
        {blackoutDates.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No blackout dates set</div>
        ) : (
          <div className="divide-y divide-gray-800">
            {blackoutDates.map((b) => (
              <div key={b.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <span className="text-white text-sm">{b.date}</span>
                  <span className="text-gray-500 text-sm ml-2">— {b.reason}</span>
                  {b.location && (
                    <span className="text-xs text-gray-600 ml-2">({b.location.name})</span>
                  )}
                  {!b.locationId && (
                    <span className="text-xs text-amber-500 ml-2">(All locations)</span>
                  )}
                </div>
                <button
                  onClick={() => deleteBlackout(b.id)}
                  className="px-2 py-1 text-xs text-red-400 border border-red-400/30 rounded hover:bg-red-400/10 transition"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add new blackout */}
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4">Add Blackout Date</h3>
        <form onSubmit={createBlackout} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Date</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              required
              className="px-3 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gold-400 [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Reason</label>
            <input
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              required
              className="px-3 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gold-400"
              placeholder="Private event"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Location</label>
            <select
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              className="px-3 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gold-400"
            >
              <option value="">All Locations</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 bg-gold-300 text-black font-medium text-sm rounded-lg hover:bg-gold-400 transition disabled:opacity-50"
          >
            {creating ? "Adding..." : "Add Blackout"}
          </button>
        </form>
      </div>
    </div>
  );
}
