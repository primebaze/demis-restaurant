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

// The staff list changes rarely; keep it for a minute per server instance.
let staffCache: { at: number; staff: ClockinStaff[] } | null = null;

/** Everyone on the clock-in staff list, turned-off people included (active: false). */
export async function getClockinStaff(fresh = false): Promise<ClockinStaff[]> {
  if (DEV_MOCK) return DEV_STAFF;
  if (!fresh && staffCache && Date.now() - staffCache.at < 60_000) return staffCache.staff;
  const data = await bridge<{ staff: ClockinStaff[] }>("/staff");
  const staff = (data.staff || []).map((s) => ({ ...s, role: String(s.role || "").toLowerCase(), active: !!s.active }));
  staffCache = { at: Date.now(), staff };
  return staff;
}

export async function getClockinPerson(id: number): Promise<ClockinStaff | null> {
  const all = await getClockinStaff();
  return all.find((s) => s.id === id) ?? null;
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
  const data = await bridge<{ clocked_in: { staff_id: number; since: string }[] }>("/clocked-in");
  return new Map((data.clocked_in || []).map((r) => [r.staff_id, r.since]));
}

/* ─── Rota (shifts live in the clock-in app; both rota builders share them) ─── */

export type ClockinShift = { id: number; staffId: number; date: string; start: string; end: string; notes: string | null };
type RawShift = { id: number; staff_id: number; date: string; start: string; end: string; notes: string | null };
const fromRaw = (s: RawShift): ClockinShift => ({ id: s.id, staffId: s.staff_id, date: s.date, start: s.start, end: s.end, notes: s.notes });

// Local test rota for development without the clock-in link.
const devShifts: ClockinShift[] = [];
let devNextId = 900001; // far above real clock-in shift ids, so test rows never clash

/** Every shift between two dates (YYYY-MM-DD, inclusive). */
export async function getShifts(start: string, end: string): Promise<ClockinShift[]> {
  if (DEV_MOCK) return devShifts.filter((s) => s.date >= start && s.date <= end).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const data = await bridge<{ shifts: RawShift[] }>(`/rota?start=${start}&end=${end}`);
  return (data.shifts || []).map(fromRaw);
}

export type ShiftInput = { staffId: number; date: string; start: string; end: string; notes?: string | null };

async function bridgeWrite<T>(path: string, method: string, actor: string, body?: object): Promise<T> {
  if (!API || KEY.length < 32) throw new Error("Clock-in link is not set up");
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
  return data as T;
}

const toRaw = (s: ShiftInput) => ({ staff_id: s.staffId, date: s.date, start: s.start, end: s.end, notes: s.notes ?? null });

export async function createShift(s: ShiftInput, actor: string): Promise<ClockinShift> {
  if (DEV_MOCK) {
    const shift = { id: devNextId++, staffId: s.staffId, date: s.date, start: s.start, end: s.end, notes: s.notes ?? null };
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
