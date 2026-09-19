"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Camera, MapPin, Plus } from "lucide-react";
import {
  SHOOT_STATUSES,
  formatWeek,
  startOfWeek,
  WORK_TYPES,
  SHOOT_LOCATIONS,
  type ShootSummary,
} from "@/lib/shoot-plans";
import {
  Action,
  CaptureProgress,
  Feedback,
  StatusBadge,
  errorMessage,
  plannerRequest,
  fieldClass,
  linkClass,
} from "./ShootPlanUI";
type Data = {
  plans: ShootSummary[];
  total: number;
  page: number;
  pages: number;
};
export default function ShootPlanList() {
  const search = useSearchParams();
  const router = useRouter();
  const status = search.get("status") || "";
  const week = search.get("week") || "";
  const page = search.get("page") || "1";
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    plannerRequest<Data>(
      `/api/admin/shoot-plans?status=${encodeURIComponent(status)}&page=${encodeURIComponent(page)}&week=${encodeURIComponent(week)}`,
      { signal: controller.signal },
    )
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(errorMessage(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [status, page, week, retry]);
  function navigate(nextStatus: string, nextPage = 1, nextWeek = week) {
    const params = new URLSearchParams();
    if (nextWeek) params.set("week", nextWeek);
    if (nextStatus) params.set("status", nextStatus);
    if (nextPage > 1) params.set("page", String(nextPage));
    router.push(`/admin/shoot-plans${params.size ? `?${params}` : ""}`);
  }
  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold-300">
            Demi’s weekly planner
          </p>
          <h1 className="text-2xl font-bold text-white">Weekly plans</h1>
          {/* Plans organize the food, people and moments to capture. */}
        </div>
        <Link
          href="/admin/shoot-plans/new"
          className={`${linkClass} bg-gold-300 !text-[#1a1a1a] hover:!bg-gold-200`}
        >
          <Plus size={17} aria-hidden="true" />
          New weekly plan
        </Link>
      </header>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <label
            htmlFor="shoot-filter"
            className="mb-2 block text-xs font-medium text-gray-400"
          >
            Status
          </label>
          <select
            id="shoot-filter"
            value={status}
            onChange={(e) => navigate(e.target.value)}
            className={fieldClass}
          >
            <option value="">All statuses</option>
            {Object.entries(SHOOT_STATUSES).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="week-filter"
            className="mb-2 block text-xs font-medium text-gray-400"
          >
            Week starting
          </label>
          <input
            id="week-filter"
            type="date"
            value={week}
            className={fieldClass}
            onChange={(e) => navigate(status, 1, startOfWeek(e.target.value))}
          />
        </div>
        {week && (
          <Action onClick={() => navigate(status, 1, "")}>All weeks</Action>
        )}
        <p className="text-sm text-gray-400" role="status">
          {loading
            ? "Loading weekly plans…"
            : data && !error
              ? `${data.total} ${data.total === 1 ? "plan" : "plans"}`
              : ""}
        </p>
      </div>
      {error ? (
        <Feedback error>
          {error}
          <div className="mt-3 flex flex-wrap gap-3">
            <Action onClick={() => setRetry((r) => r + 1)}>Try again</Action>
            <Link
              className={linkClass}
              href="/admin/login"
              target="_blank"
              rel="noopener noreferrer"
            >
              Sign in
            </Link>
          </div>
        </Feedback>
      ) : loading ? (
        <div
          className="flex min-h-64 items-center justify-center rounded-2xl border border-gray-800 text-sm text-gray-400"
          role="status"
        >
          Loading weekly plans…
        </div>
      ) : data?.plans.length ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.plans.map((plan) => (
              <Link
                href={`/admin/shoot-plans/${plan.id}`}
                key={plan.id}
                className="group flex min-w-0 flex-col rounded-2xl border border-gray-800 bg-[#1a1a1a] p-5 transition-colors hover:border-gold-300/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
              >
                <div className="flex items-center justify-between gap-3">
                  <StatusBadge status={plan.status} />
                  <ArrowRight
                    size={17}
                    aria-hidden="true"
                    className="text-gray-500 group-hover:text-gold-300"
                  />
                </div>
                <h2 className="mb-4 mt-5 break-words text-lg font-semibold text-white">
                  {plan.title}
                </h2>
                <div className="space-y-2 text-sm text-gray-400">
                  <p className="flex items-start gap-2">
                    <CalendarDays
                      size={16}
                      className="mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>
                      {formatWeek(plan.weekStart || startOfWeek(plan.date))}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin size={16} aria-hidden="true" />
                    {SHOOT_LOCATIONS[plan.location]}
                  </p>
                </div>
                {plan.objective && (
                  <p className="mt-4 line-clamp-2 break-words text-sm leading-relaxed text-gray-400">
                    {plan.objective}
                  </p>
                )}
                <div className="mt-auto space-y-3 pt-6 text-sm text-gray-400">
                  {!!plan.activities?.length ? (
                    <>
                      <p className="text-xs text-gold-300">
                        {Array.from(
                          new Set(
                            plan.activities.map(
                              (item) => WORK_TYPES[item.type],
                            ),
                          ),
                        ).join(" · ")}
                      </p>
                      <p>
                        {
                          plan.activities.filter(
                            (item) => item.status === "completed",
                          ).length
                        }{" "}
                        of {plan.activities.length} activities complete
                      </p>
                    </>
                  ) : (
                    <CaptureProgress
                      captured={plan.capturedCount}
                      total={plan.shotCount}
                    />
                  )}
                </div>
              </Link>
            ))}
          </div>
          <nav
            aria-label="Weekly plan pages"
            className="mt-6 flex items-center justify-between gap-3"
          >
            <Action
              disabled={data.page <= 1}
              onClick={() => navigate(status, data.page - 1)}
            >
              Previous
            </Action>
            <p className="text-sm text-gray-400">
              Page {data.page} of {data.pages}
            </p>
            <Action
              disabled={data.page >= data.pages}
              onClick={() => navigate(status, data.page + 1)}
            >
              Next
            </Action>
          </nav>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-700 px-6 py-16 text-center">
          <Camera
            size={32}
            aria-hidden="true"
            className="mx-auto mb-5 text-gold-300"
          />
          <h2 className="text-xl font-semibold">
            {status || week
              ? "No plans match these filters"
              : "No weekly plans yet"}
          </h2>
          {/* An empty filter offers Show all plans; an empty list offers plan creation. */}
          <div className="mt-6">
            {status || week ? (
              <Action onClick={() => navigate("", 1, "")}>
                Show all plans
              </Action>
            ) : (
              <Link
                href="/admin/shoot-plans/new"
                className={`${linkClass} border border-gold-300/40 text-gold-300`}
              >
                Create your first weekly plan{" "}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
