/**
 * Read-only link to the clock-in app (staff.demisrestaurant.com, Laravel).
 *
 * Calls its private /api/bridge/* routes with a shared key. PINs are checked
 * inside the clock-in app; they never come here. Server-only.
 *
 * Env (Vercel): CLOCKIN_API_URL = https://staff.demisrestaurant.com/api/bridge
 *               CLOCKIN_BRIDGE_KEY = same value as MEETINGS_BRIDGE_KEY in the clock-in app's .env
 *
 * Local development without those set uses a small made-up staff list
 * (DEV_STAFF below, every PIN is 1234) so the screens can be tried.
 */

export type ClockinStaff = {
  id: number;
  name: string;
  email: string | null;
  role: string; // lower-case role name from the clock-in app, e.g. "manager"
  active: boolean;
};

const API = (process.env.CLOCKIN_API_URL || "").replace(/\/+$/, "");
const KEY = process.env.CLOCKIN_BRIDGE_KEY || "";
const DEV_MOCK = !API && process.env.NODE_ENV === "development";

// Test data for local development only. Names are made up.
const DEV_STAFF: ClockinStaff[] = [
  { id: 9001, name: "Ada Test", email: null, role: "manager", active: true },
  { id: 9002, name: "Kemi Test", email: null, role: "server", active: true },
  { id: 9003, name: "Tunde Test", email: null, role: "cook", active: true },
  { id: 9004, name: "Dayo Test", email: null, role: "server", active: false },
];
const DEV_PIN = "1234";

export function clockinConfigured(): boolean {
  return DEV_MOCK || (!!API && KEY.length >= 32);
}

export function isManagerRole(role: string): boolean {
  return role.trim().toLowerCase() === "manager";
}

/*
 * The clock-in app is on separate hosting and each call takes 0.5 to 2 seconds, so reads are kept
 * briefly per server instance (stale-while-revalidate): a fresh copy is used as is, an older one is
 * returned straight away while a new one loads in the background, and identical reads that arrive
 * together share one call. Any write clears the kept reads, so a manager sees their own change at once.
 */
type Kept = { at: number; value: unknown; loading?: Promise<unknown> };
const kept = new Map<string, Kept>();
const FRESH_MS = (path: string) => (path.startsWith("/staff") ? 10 * 60_000 : 20_000);
const STALE_MS = (path: string) => (path.startsWith("/staff") ? 60 * 60_000 : path.startsWith("/clocked-in") ? 60_000 : 5 * 60_000);

async function cachedRead<T>(path: string): Promise<T> {
  const now = Date.now();
  const hit = kept.get(path);
  const load = () => {
    const p = bridge<T>(path)
      .then((value) => { kept.set(path, { at: Date.now(), value }); return value; })
      .catch((e) => { const k = kept.get(path); if (k) k.loading = undefined; throw e; });
    kept.set(path, { ...(kept.get(path) || { at: 0, value: undefined }), loading: p });
    return p;
  };
  if (hit && hit.value !== undefined) {
    const age = now - hit.at;
    if (age < FRESH_MS(path)) return hit.value as T;
    if (age < STALE_MS(path)) {
      if (!hit.loading) load().catch(() => {}); // refresh behind the scenes
      return hit.value as T;
    }
  }
  if (hit?.loading) return hit.loading as Promise<T>;
  return load();
}

/** Forget kept reads (after a write, so the next read is fresh). */
export function forgetClockinReads() {
  kept.clear();
}

async function bridge<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API || KEY.length < 32) throw new Error("Clock-in link is not set up");
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Accept: "application/json", "Content-Type": "application/json", "X-Bridge-Key": KEY, ...(init?.headers || {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Clock-in link answered ${res.status}`);
  return (await res.json()) as T;
}


/** Everyone on the clock-in staff list, turned-off people included (active: false). */
export async function getClockinStaff(fresh = false): Promise<ClockinStaff[]> {
  if (DEV_MOCK) return DEV_STAFF;
  if (fresh) kept.delete("/staff");
  const data = await cachedRead<{ staff: ClockinStaff[] }>("/staff");
  const staff = (data.staff || []).map((s) => ({ ...s, role: String(s.role || "").toLowerCase(), active: !!s.active }));
  return staff;
}

export async function getClockinPerson(id: number): Promise<ClockinStaff | null> {
  const all = await getClockinStaff();
  return all.find((s) => s.id === id) ?? null;
}

/** Turn someone off (they've left) or back on, in the clock-in app itself. */
export async function setStaffActive(id: number, active: boolean, actor: string): Promise<void> {
  if (DEV_MOCK) {
    const s = DEV_STAFF.find((x) => x.id === id);
    if (s) s.active = active;
    return;
  }
  await bridgeWrite(`/staff/${id}/active`, "PUT", actor, { active });
}

/** True only when the PIN is right AND the person is switched on in the clock-in app. */
export async function verifyClockinPin(staffId: number, pin: string): Promise<boolean> {
  if (!/^\d{4}$/.test(pin)) return false;
  if (DEV_MOCK) return pin === DEV_PIN && DEV_STAFF.some((s) => s.id === staffId && s.active);
  const data = await bridge<{ ok: boolean }>("/verify-pin", { method: "POST", body: JSON.stringify({ staff_id: staffId, pin }) });
  return data.ok === true;
}

/** Who is clocked in right now, with when they clocked in. */
export async function getClockedIn(): Promise<Map<number, string>> {
  if (DEV_MOCK) return new Map([[9002, new Date(Date.now() - 3 * 3600_000).toISOString()]]);
  const data = await cachedRead<{ clocked_in: { staff_id: number; since: string }[] }>("/clocked-in");
  return new Map((data.clocked_in || []).map((r) => [r.staff_id, r.since]));
}

/* ─── Rota (shifts live in the clock-in app; both rota builders share them) ─── */

export type ClockinShift = { id: number; staffId: number; date: string; start: string; end: string; notes: string | null };
type RawShift = { id: number; staff_id: number; date: string; start: string; end: string; notes: string | null };
const fromRaw = (s: RawShift): ClockinShift => ({ id: s.id, staffId: s.staff_id, date: s.date, start: s.start, end: s.end, notes: s.notes });

// Local test rota for development without the clock-in link.
// Kept on globalThis so every route sees the same list in development (each route is its own bundle).
const devStore = ((globalThis as unknown as { __meetDevRota?: { shifts: ClockinShift[]; next: number } }).__meetDevRota ??= {
  shifts: [],
  next: 900001, // far above real clock-in shift ids, so test rows never clash
});
const devShifts = devStore.shifts;

/** Every shift between two dates (YYYY-MM-DD, inclusive). */
export async function getShifts(start: string, end: string): Promise<ClockinShift[]> {
  if (DEV_MOCK) return devShifts.filter((s) => s.date >= start && s.date <= end).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const data = await cachedRead<{ shifts: RawShift[] }>(`/rota?start=${start}&end=${end}`);
  return (data.shifts || []).map(fromRaw);
}

export type ShiftInput = { staffId: number; date: string; start: string; end: string; notes?: string | null };

async function bridgeWrite<T>(path: string, method: string, actor: string, body?: object): Promise<T> {
  if (!API || KEY.length < 32) throw new Error("Clock-in link is not set up");
  forgetClockinReads();
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Accept: "application/json", "Content-Type": "application/json", "X-Bridge-Key": KEY, "X-Bridge-Actor": actor.slice(0, 60) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Laravel validation: { message, errors: { field: [msg] } }
    const first = data?.errors ? (Object.values(data.errors)[0] as string[])?.[0] : null;
    throw new Error(first || data?.message || `Clock-in link answered ${res.status}`);
  }
  forgetClockinReads();
  return data as T;
}

const toRaw = (s: ShiftInput) => ({ staff_id: s.staffId, date: s.date, start: s.start, end: s.end, notes: s.notes ?? null });

export async function createShift(s: ShiftInput, actor: string): Promise<ClockinShift> {
  if (DEV_MOCK) {
    const shift = { id: devStore.next++, staffId: s.staffId, date: s.date, start: s.start, end: s.end, notes: s.notes ?? null };
    devShifts.push(shift);
    return shift;
  }
  const d = await bridgeWrite<{ shift: RawShift }>("/rota/shifts", "POST", actor, toRaw(s));
  return fromRaw(d.shift);
}

export async function updateShift(id: number, s: ShiftInput, actor: string): Promise<ClockinShift> {
  if (DEV_MOCK) {
    const i = devShifts.findIndex((x) => x.id === id);
    if (i < 0) throw new Error("Shift not found");
    devShifts[i] = { id, staffId: s.staffId, date: s.date, start: s.start, end: s.end, notes: s.notes ?? null };
    return devShifts[i];
  }
  const d = await bridgeWrite<{ shift: RawShift }>(`/rota/shifts/${id}`, "PUT", actor, toRaw(s));
  return fromRaw(d.shift);
}

export async function deleteShift(id: number, actor: string): Promise<void> {
  if (DEV_MOCK) {
    const i = devShifts.findIndex((x) => x.id === id);
    if (i >= 0) devShifts.splice(i, 1);
    return;
  }
  await bridgeWrite(`/rota/shifts/${id}`, "DELETE", actor);
}

/* ─── Budget and rota cost (worked out by the clock-in app: hours x hourly rate) ─── */

export type RotaCosts = { days: { date: string; budget: number | null; cost: number }[]; totalCost: number };
const devBudgets = ((globalThis as unknown as { __meetDevBudgets?: Map<string, number> }).__meetDevBudgets ??= new Map<string, number>());
const DEV_RATE = 12.5; // made-up hourly rate for local testing

export async function getRotaCosts(start: string, end: string): Promise<RotaCosts> {
  if (DEV_MOCK) {
    const days: RotaCosts["days"] = [];
    for (let d = start; d <= end; d = new Date(new Date(`${d}T12:00:00Z`).getTime() + 86400_000).toISOString().slice(0, 10)) {
      const cost = devShifts.filter((s) => s.date === d).reduce((n, s) => {
        let m = Number(s.end.slice(0, 2)) * 60 + Number(s.end.slice(3)) - (Number(s.start.slice(0, 2)) * 60 + Number(s.start.slice(3)));
        if (m <= 0) m += 1440;
        return n + Math.round((m / 60) * DEV_RATE * 100) / 100;
      }, 0);
      days.push({ date: d, budget: devBudgets.get(d) ?? null, cost: Math.round(cost * 100) / 100 });
    }
    return { days, totalCost: Math.round(days.reduce((n, d) => n + d.cost, 0) * 100) / 100 };
  }
  const data = await cachedRead<{ days: { date: string; budget: number | null; cost: number }[]; total_cost: number }>(`/rota/costs?start=${start}&end=${end}`);
  return { days: data.days || [], totalCost: data.total_cost || 0 };
}

/** Set (or clear with 0/null) one day's budget in the clock-in app. */
export async function setDayBudget(date: string, amount: number | null, actor: string): Promise<void> {
  if (DEV_MOCK) {
    if (!amount) devBudgets.delete(date); else devBudgets.set(date, Math.round(amount * 100) / 100);
    return;
  }
  await bridgeWrite(`/rota/budgets/${date}`, "PUT", actor, { amount });
}

/* ─── Hours (clock-in and clock-out times, worked out by the clock-in app's timesheet) ─── */

export type DayHours = {
  date: string;
  hours: number; // after any manager override
  adjusted: boolean; // a manager set this day's hours
  shifts: { in: string; out: string | null }[]; // HH:MM, London; out null = never clocked out
};
export type Timesheet = { staffId: number; name: string; role: string; rate: number; days: DayHours[]; total: number; pay: number };

type RawSheet = {
  staff_id: number; name: string; role: string; hourly_rate: number;
  daily_hours: Record<string, number>; adjusted_dates: string[]; weekly_total: number; weekly_pay: number;
  entries?: { action: string; captured_at: string }[];
};

/** Pair clock-ins with the clock-out after them; each shift belongs to its clock-in day. */
function pairEntries(entries: { action: string; at: string }[]): Map<string, { in: string; out: string | null }[]> {
  const byDay = new Map<string, { in: string; out: string | null }[]>();
  const sorted = [...entries].sort((a, b) => a.at.localeCompare(b.at));
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].action !== "clock_in") continue;
    const day = sorted[i].at.slice(0, 10);
    const next = sorted[i + 1];
    const out = next && next.action === "clock_out" ? next.at.slice(11, 16) : null;
    if (out) i++;
    byDay.set(day, [...(byDay.get(day) || []), { in: sorted[i - (out ? 1 : 0)].at.slice(11, 16), out }]);
  }
  return byDay;
}

// Local test hours: past dev rota shifts become clock-ins (a couple of minutes late, a few minutes over),
// with Tunde forgetting to clock out on weekends so missed clock-outs can be tried.
const devHours = ((globalThis as unknown as { __meetDevHours?: Map<string, number> }).__meetDevHours ??= new Map<string, number>());

function devSheets(start: string, end: string, staffId?: number): Timesheet[] {
  const today = new Date().toISOString().slice(0, 10);
  return DEV_STAFF.filter((s) => s.active && (!staffId || s.id === staffId)).map((s) => {
    const days: DayHours[] = [];
    for (let d = start; d <= end; d = new Date(new Date(`${d}T12:00:00Z`).getTime() + 86400_000).toISOString().slice(0, 10)) {
      const mine = devShifts.filter((x) => x.staffId === s.id && x.date === d && d < today);
      const weekend = [0, 6].includes(new Date(`${d}T12:00:00Z`).getUTCDay());
      const shifts = mine.map((x) => {
        const add = (t: string, m: number) => { const v = (Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) + m + 1440) % 1440; return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`; };
        return { in: add(x.start, 2), out: s.id === 9003 && weekend ? null : add(x.end, 5) };
      });
      const worked = shifts.reduce((n, x) => {
        if (!x.out) return n + 8;
        let m = Number(x.out.slice(0, 2)) * 60 + Number(x.out.slice(3)) - (Number(x.in.slice(0, 2)) * 60 + Number(x.in.slice(3)));
        if (m <= 0) m += 1440;
        return n + m / 60;
      }, 0);
      const key = `${s.id}|${d}`;
      days.push({ date: d, hours: devHours.has(key) ? devHours.get(key)! : Math.round(worked * 100) / 100, adjusted: devHours.has(key), shifts });
    }
    const total = Math.round(days.reduce((n, x) => n + x.hours, 0) * 100) / 100;
    return { staffId: s.id, name: s.name, role: s.role, rate: DEV_RATE, days, total, pay: Math.round(total * DEV_RATE * 100) / 100 };
  });
}

/** Everyone's hours (or one person's) between two dates, from the clock-in app. */
export async function getTimesheets(start: string, end: string, staffId?: number): Promise<Timesheet[]> {
  if (DEV_MOCK) return devSheets(start, end, staffId);
  const q = `/timesheet?start=${start}&end=${end}${staffId ? `&staff_id=${staffId}` : ""}`;
  const data = await cachedRead<{ timesheets: RawSheet[] }>(q);
  return (data.timesheets || []).map((t) => {
    const paired = pairEntries((t.entries || []).map((e) => ({ action: e.action, at: e.captured_at })));
    const adjusted = new Set(t.adjusted_dates || []);
    return {
      staffId: t.staff_id,
      name: t.name,
      role: t.role,
      rate: Number(t.hourly_rate) || 0,
      days: Object.entries(t.daily_hours || {}).map(([date, hours]) => ({ date, hours: Number(hours) || 0, adjusted: adjusted.has(date), shifts: paired.get(date) || [] })),
      total: Number(t.weekly_total) || 0,
      pay: Number(t.weekly_pay) || 0,
    };
  });
}

/** Set one person's hours for a day in the clock-in app (a manager override), or clear it with null. */
export async function setDayHours(staffId: number, date: string, hours: number | null, actor: string): Promise<void> {
  if (DEV_MOCK) {
    if (hours === null) devHours.delete(`${staffId}|${date}`); else devHours.set(`${staffId}|${date}`, Math.round(hours * 100) / 100);
    return;
  }
  await bridgeWrite(`/hours/${staffId}/${date}`, "PUT", actor, { hours });
}
