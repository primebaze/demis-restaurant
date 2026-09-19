"use client";
import ShootPlanDocument from "./ShootPlanDocument";
import ShootPlanEditor from "@/components/admin/ShootPlanEditor";
import type { ShootPlan } from "@/lib/shoot-plans";
import { useCallback, useEffect, useRef, useState } from "react";
import { LockKeyhole } from "lucide-react";
import type { ShootDraft } from "@/lib/shoot-plans";
import {
  Action,
  Feedback,
  PlannerRequestError,
  fieldClass,
  plannerRequest,
} from "@/components/admin/ShootPlanUI";
type PublicPlan = Omit<ShootDraft, "shots"> & {
  updatedAt: string;
  shots: Omit<ShootDraft["shots"][number], "id">[];
};
export default function PublicShootPlan({
  token,
  editable = false,
}: {
  token: string;
  editable?: boolean;
}) {
  const [plan, setPlan] = useState<PublicPlan | null>(null);
  const [state, setState] = useState<
    "loading" | "locked" | "ready" | "unavailable" | "error"
  >("loading");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const pending = useRef(false);
  const readVersion = useRef(0);
  const endpoint = `/api/shoot-plans/${editable ? "collaborate/" : ""}${encodeURIComponent(token)}`;
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const requestVersion = ++readVersion.current;
      try {
        const data = await plannerRequest<{ plan: PublicPlan }>(endpoint, {
          signal,
        });
        if (!signal?.aborted && requestVersion === readVersion.current) {
          setPlan(data.plan);
          setState("ready");
          setError("");
        }
      } catch (err) {
        if (signal?.aborted || requestVersion !== readVersion.current) return;
        setPlan(null);
        if (err instanceof PlannerRequestError && err.status === 401) {
          setState("locked");
          setError("");
        } else {
          setState(
            err instanceof PlannerRequestError && err.status === 404
              ? "unavailable"
              : "error",
          );
          setError(
            err instanceof PlannerRequestError
              ? err.message
              : "Couldn’t load the plan. Check your connection and try again.",
          );
        }
      }
    },
    [endpoint],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  useEffect(() => {
    if (state !== "ready" || editable) return;
    const controller = new AbortController();
    const refresh = () => {
      if (document.visibilityState === "visible" && !pending.current)
        void load(controller.signal);
    };
    const timer = setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [state, load, editable]);
  async function unlock() {
    if (pending.current) return;
    setError("");
    if (!/^\d{6}$/.test(pin)) {
      setError("Enter the six-digit PIN from the organiser.");
      input.current?.focus();
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      await plannerRequest(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      setPin("");
      setShowPin(false);
      await load();
    } catch (err) {
      setError(
        err instanceof PlannerRequestError
          ? err.message
          : "Couldn’t unlock the plan. Check your connection and try again.",
      );
      setPin("");
      input.current?.focus();
      if (err instanceof PlannerRequestError && err.status === 404)
        setState("unavailable");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function lock() {
    if (pending.current) return;
    readVersion.current++;
    pending.current = true;
    setBusy(true);
    try {
      await plannerRequest(endpoint, { method: "DELETE" });
      setPlan(null);
      setState("locked");
      setPin("");
      setError("");
    } catch {
      setError(
        "Couldn’t lock this browser. Check your connection and try again.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="min-h-screen bg-[#0f0f0f] px-4 py-8 text-white sm:px-8">
      <div className={`mx-auto max-w-6xl`}>
        <header className="mb-8 flex items-center justify-between gap-3 border-b border-gray-800 pb-5">
          <div>
            <p className="text-xl font-bold text-gold-300">Demi’s</p>
            <p className="mt-1 text-xs uppercase tracking-widest text-gray-400">
              {editable ? "Collaborator weekly plan" : "Weekly plan"}
            </p>
          </div>
          <span className="flex items-center gap-2 text-xs text-gray-400">
            <LockKeyhole size={14} aria-hidden="true" />
            Private access
          </span>
        </header>
        {state === "loading" ? (
          <p className="py-20 text-center text-gray-400" role="status">
            Checking access…
          </p>
        ) : state === "locked" ? (
          <section className="mx-auto my-16 max-w-md rounded-2xl border border-gray-800 bg-[#1a1a1a] p-6 sm:p-8">
            <LockKeyhole
              size={28}
              className="mb-5 text-gold-300"
              aria-hidden="true"
            />
            <h1 className="text-2xl font-bold">You’re invited to the shoot.</h1>
            {/* The PIN gate selects viewer or collaborator access according to the link. */}
            <form
              className="mt-6"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void unlock();
              }}
            >
              <label
                htmlFor="visitor-pin"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Six-digit PIN
              </label>
              <div className="flex gap-2">
                <input
                  ref={input}
                  id="visitor-pin"
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  autoComplete="current-password"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  disabled={busy}
                  aria-invalid={!!error || undefined}
                  aria-describedby={error ? "visitor-pin-error" : undefined}
                  className={`${fieldClass} tracking-[0.4em]`}
                />
                <Action
                  aria-label={showPin ? "Hide PIN" : "Show PIN"}
                  aria-pressed={showPin}
                  onClick={() => setShowPin((value) => !value)}
                >
                  {showPin ? "Hide" : "Show"}
                </Action>
              </div>
              {error && (
                <p
                  id="visitor-pin-error"
                  role="alert"
                  className="mt-3 text-sm text-red-300"
                >
                  {error}
                </p>
              )}
              <Action
                type="submit"
                primary
                disabled={busy}
                className="mt-5 w-full"
              >
                {busy
                  ? "Unlocking…"
                  : editable
                    ? "Edit shoot plan"
                    : "View shoot plan"}
              </Action>
            </form>
            {/* The organiser supplies the PIN separately. */}
          </section>
        ) : state !== "ready" || !plan ? (
          <section className="py-12">
            <h1 className="mb-4 text-2xl font-bold">
              {state === "unavailable"
                ? "Link unavailable"
                : "Unable to load the plan"}
            </h1>
            <Feedback error>{error}</Feedback>
            {state === "error" && (
              <Action
                className="mt-4"
                onClick={() => {
                  setState("loading");
                  void load();
                }}
              >
                Try again
              </Action>
            )}
          </section>
        ) : editable ? (
          <>
            {error && (
              <div className="mb-5">
                <Feedback error>{error}</Feedback>
              </div>
            )}
            <ShootPlanEditor
              key={token}
              initial={plan as ShootPlan}
              collaboration={{
                endpoint,
                unlockPath: `/shoot-plans/collaborate/${token}`,
                onLock: () => void lock(),
                busy,
              }}
            />
          </>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-gray-400">Read-only</span>
              <div className="flex gap-2">
                <Action disabled={busy} onClick={() => void load()}>
                  Refresh plan
                </Action>
                <Action disabled={busy} onClick={lock}>
                  Lock page
                </Action>
              </div>
            </div>
            {error && (
              <div className="mb-5">
                <Feedback error>{error}</Feedback>
              </div>
            )}
            <ShootPlanDocument
              plan={plan}
              imageEndpoint={`${endpoint}/references`}
            />
          </>
        )}
      </div>
    </div>
  );
}
