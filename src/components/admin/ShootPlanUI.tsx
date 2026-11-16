"use client";

import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { SHOOT_STATUSES, type ShootStatus } from "@/lib/shoot-plans";

export const fieldClass =
  "w-full min-h-11 rounded-lg border border-sand-300 bg-sand-100 px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-300 disabled:opacity-60 [color-scheme:light]";
export const linkClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-sand-100 hover:text-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-honey-300";
export function Action({
  primary = false,
  className = "",
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      {...props}
      className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors active:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-honey-300 disabled:cursor-not-allowed disabled:opacity-40 ${primary ? "bg-honey-300 text-ink-900 hover:bg-honey-200" : "border border-sand-300 text-stone-800 hover:bg-sand-100"} ${className}`}
    />
  );
}
export function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-stone-700"
      >
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
export function Feedback({
  error,
  children,
}: {
  error?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      role={error ? "alert" : "status"}
      className={`rounded-xl border p-4 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
    >
      {children}
    </div>
  );
}
export function StatusBadge({ status }: { status: ShootStatus }) {
  const colours = {
    planned: "bg-sand-200 text-stone-900",
    in_progress: "bg-sand-200 text-stone-900",
    completed: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-stone-400/10 text-stone-700",
  };
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${colours[status]}`}
    >
      {SHOOT_STATUSES[status]}
    </span>
  );
}
export function CaptureProgress({
  captured,
  total,
}: {
  captured: number;
  total: number;
}) {
  return (
    <div>
      <div className="mb-2 flex justify-between gap-3 text-xs text-stone-500">
        <span>Shot list</span>
        <span>
          {captured} / {total} captured
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Shots captured"
        aria-valuenow={captured}
        aria-valuemin={0}
        aria-valuemax={total || 1}
        className="h-1.5 overflow-hidden rounded-full bg-sand-200"
      >
        <div
          className="h-full rounded-full bg-honey-300"
          style={{ width: `${total ? (captured / total) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}
export class PlannerRequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public field?: string,
  ) {
    super(message);
  }
}
export async function plannerRequest<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const timeout = AbortSignal.timeout(20_000);
  const response = await fetch(url, {
    ...init,
    signal: init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new PlannerRequestError(
      body?.error || "The request could not be completed. Try again.",
      response.status,
      body?.field,
    );
  if (!body)
    throw new Error("The server response could not be read. Please retry.");
  return body as T;
}
export function errorMessage(error: unknown): string {
  return error instanceof PlannerRequestError
    ? error.message
    : "We couldn’t confirm the request. Check your connection and retry; your edits are still here.";
}

/** Shared protection for full-page planner forms; native dialog owns focus/inertness. */
export function UnsavedGuard({ dirty }: { dirty: boolean }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [destination, setDestination] = useState<string | null>(null);
  const activeElement = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const linkClick = (event: MouseEvent) => {
      const anchor = (event.target as Element)?.closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.getAttribute("href")?.startsWith("#") ||
        anchor.hasAttribute("download") ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0 ||
        anchor.href === window.location.href
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      activeElement.current = document.activeElement as HTMLElement;
      setDestination(anchor.href);
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", linkClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", linkClick, true);
    };
  }, [dirty]);
  useEffect(() => {
    if (destination) dialog.current?.showModal();
  }, [destination]);
  function close() {
    dialog.current?.close();
    setDestination(null);
    activeElement.current?.focus();
  }
  return (
    <dialog
      ref={dialog}
      onCancel={close}
      className="w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-sand-300 bg-sand-50 p-6 text-stone-900 backdrop:bg-black/70"
      aria-labelledby="leave-title"
      aria-describedby="leave-description"
    >
      <h2 id="leave-title" className="text-xl font-bold">
        Leave without saving?
      </h2>
      <p id="leave-description" className="mt-3 text-sm text-stone-700">
        Your latest changes to this plan haven’t been saved.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Action autoFocus onClick={close}>
          Keep editing
        </Action>
        <Action
          onClick={() => {
            const href = destination;
            close();
            if (href) {
              const url = new URL(href);
              if (url.origin === window.location.origin)
                router.push(url.pathname + url.search + url.hash);
              else window.location.assign(href);
            }
          }}
        >
          Leave without saving
        </Action>
      </div>
    </dialog>
  );
}

export function ConfirmDelete({
  open,
  busy,
  title,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="delete-plan-title"
      aria-describedby="delete-plan-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      className="max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-2xl border border-sand-300 bg-sand-50 p-6 text-stone-900 backdrop:bg-black/70"
    >
      <h2 id="delete-plan-title" className="text-xl font-bold">
        Delete plan?
      </h2>
      <p
        id="delete-plan-description"
        className="mt-3 break-words text-sm text-stone-700"
      >
        “{title}” and its activities, shots, reference images and sharing links
        will be permanently removed.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Action autoFocus disabled={busy} onClick={onCancel}>
          Cancel
        </Action>
        <Action
          disabled={busy}
          onClick={onConfirm}
          className="border-red-200 text-red-700"
        >
          {busy ? "Deleting…" : "Delete permanently"}
        </Action>
      </div>
    </dialog>
  );
}
