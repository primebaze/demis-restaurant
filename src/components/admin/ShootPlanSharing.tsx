"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Copy, LockKeyhole } from "lucide-react";
import {
  Action,
  Feedback,
  Field,
  fieldClass,
  plannerRequest,
  errorMessage,
  PlannerRequestError,
} from "./ShootPlanUI";
type Share = { token: string; enabled: boolean; version: number };
export default function ShootPlanSharing({
  id,
  editable = false,
}: {
  id: string;
  editable?: boolean;
}) {
  const prefix = editable ? "collaborator-share" : "share";
  const publicPath = editable ? "/shoot-plans/collaborate" : "/shoot-plans";
  const [share, setShare] = useState<Share | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [message, setMessage] = useState("");
  const [reloadRequired, setReloadRequired] = useState(false);
  const [origin, setOrigin] = useState("");
  const pending = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const endpoint = `/api/admin/shoot-plans/${id}/${editable ? "collaborators" : "share"}`;
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");
      try {
        const result = await plannerRequest<{ share: Share | null }>(endpoint, {
          signal,
        });
        if (!signal?.aborted) {
          setShare(result.share);
          setReloadRequired(false);
        }
      } catch (err) {
        if (!signal?.aborted) {
          setError(errorMessage(err));
          setReloadRequired(true);
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [endpoint],
  );
  useEffect(() => {
    setOrigin(window.location.origin);
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  const url = share ? `${origin}${publicPath}/${share.token}` : "";
  async function change(enabled: boolean) {
    if (pending.current) return;
    setError("");
    setMessage("");
    setInvalid(false);
    if (enabled && !/^\d{6}$/.test(pin)) {
      setError("Enter a six-digit PIN.");
      setInvalid(true);
      input.current?.focus();
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      const result = await plannerRequest<{ share: Share }>(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          version: share?.version || 0,
          ...(enabled ? { pin } : {}),
        }),
      });
      setShare(result.share);
      setPin("");
      setShowPin(false);
      setMessage(
        enabled
          ? "Link ready."
          : editable
            ? "Collaborator editing turned off."
            : "Sharing turned off.",
      );
    } catch (err) {
      setError(errorMessage(err));
      setReloadRequired(
        !(err instanceof PlannerRequestError) ||
          [409, 503].includes(err.status),
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link copied.");
    } catch {
      setError(
        "Couldn’t copy the link. Select and copy it from the field below.",
      );
    }
  }
  return (
    <section
      aria-labelledby={`${prefix}-heading`}
      className="mb-6 rounded-2xl border border-gold-300/20 bg-gold-300/5 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id={`${prefix}-heading`}
            className="flex items-center gap-2 font-semibold"
          >
            <LockKeyhole size={17} aria-hidden="true" />
            {editable ? "Collaborator editing" : "Share this plan"}
          </h2>
          {/* Viewer links expose saved content read-only; collaborator links allow edits to this plan but never admin or sharing access. */}
        </div>
        <span className="text-xs text-gold-300">
          {loading
            ? "Loading…"
            : share?.enabled
              ? "PIN protected"
              : "Sharing off"}
        </span>
      </div>
      {error && (
        <div className="mt-4">
          <Feedback error>
            {error}
            {reloadRequired && (
              <div className="mt-3">
                <Action onClick={() => void load()}>
                  Reload sharing settings
                </Action>
              </div>
            )}
          </Feedback>
        </div>
      )}
      {message && (
        <p role="status" className="mt-4 text-sm text-emerald-200">
          {message}
        </p>
      )}
      {!loading && !reloadRequired && (
        <>
          {share?.enabled && (
            <div className="mt-4">
              <Field
                id={`${prefix}-link`}
                label={editable ? "Collaborator link" : "Public link"}
              >
                <input
                  id={`${prefix}-link`}
                  readOnly
                  value={url}
                  onFocus={(e) => e.target.select()}
                  className={fieldClass}
                />
              </Field>
              <div className="mt-3 flex flex-wrap gap-2">
                <Action onClick={copy}>
                  <Copy size={15} aria-hidden="true" />
                  {editable ? "Copy collaborator link" : "Copy link"}
                </Action>
                <Link
                  href={`${publicPath}/${share.token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center rounded-lg px-4 text-sm text-gold-300 hover:bg-white/5 focus-visible:outline focus-visible:outline-gold-300"
                >
                  {editable
                    ? "Open collaborator page ↗"
                    : "Open visitor page ↗"}
                </Link>
                <Action disabled={busy} onClick={() => void change(false)}>
                  {editable
                    ? "Turn off collaborator editing"
                    : "Turn off sharing"}
                </Action>
              </div>
            </div>
          )}
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void change(true);
            }}
            className="mt-5"
          >
            <label
              htmlFor={`${prefix}-pin`}
              className="mb-2 block text-sm font-medium text-gray-300"
            >
              {editable
                ? share?.enabled
                  ? "New collaborator PIN"
                  : "Set a six-digit collaborator PIN"
                : share?.enabled
                  ? "New six-digit PIN"
                  : "Set a six-digit PIN"}
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={input}
                id={`${prefix}-pin`}
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ""));
                  setInvalid(false);
                }}
                disabled={busy}
                aria-invalid={invalid || undefined}
                aria-describedby={invalid ? `${prefix}-pin-error` : undefined}
                className={`${fieldClass} !w-40 tracking-[0.3em]`}
              />
              <Action
                aria-label={
                  editable
                    ? showPin
                      ? "Hide collaborator PIN"
                      : "Show collaborator PIN"
                    : showPin
                      ? "Hide PIN"
                      : "Show PIN"
                }
                aria-pressed={showPin}
                onClick={() => setShowPin((v) => !v)}
              >
                {showPin ? "Hide" : "Show"}
              </Action>
              <Action
                type="submit"
                primary
                disabled={busy}
                className="min-w-36"
              >
                {busy
                  ? "Saving…"
                  : share?.enabled
                    ? editable
                      ? "Change collaborator PIN"
                      : "Change PIN"
                    : editable
                      ? "Enable collaborator editing"
                      : "Enable sharing"}
              </Action>
            </div>
            {invalid && (
              <p
                id={`${prefix}-pin-error`}
                className="mt-2 text-sm text-red-300"
              >
                Enter exactly six digits.
              </p>
            )}
            {/* PINs cannot be retrieved after saving. Changing a PIN invalidates existing access sessions. */}
          </form>
        </>
      )}
    </section>
  );
}
