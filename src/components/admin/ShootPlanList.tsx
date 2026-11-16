"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Camera, ChevronDown, ChevronLeft, ChevronRight, ListFilter, MapPin, Plus, X } from "lucide-react";
import {
  SHOOT_STATUSES,
  formatWeek,
  startOfWeek,
  WORK_TYPES,
  SHOOT_LOCATIONS,
  type ShootStatus,
  type ShootSummary,
} from "@/lib/shoot-plans";
import { CaptureProgress, errorMessage, plannerRequest } from "./ShootPlanUI";
import { Empty, OwnLayout, PageHead, Sheet, SheetFooter, Tag, btn, type Tone } from "./ui";
import { DateField } from "@/components/admin/ui";
type Data = {
  plans: ShootSummary[];
  total: number;
  page: number;
  pages: number;
};

const STATUS_TONE: Record<ShootStatus, Tone> = {
  planned: "wait",
  in_progress: "gold",
  completed: "ok",
  cancelled: "off",
};

/** Glass pill on the photo that holds a native control (select or date). */
const glassPill =
  "relative inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-[rgba(58,52,48,0.48)] pl-4 pr-3 text-[15px] font-light text-white backdrop-blur-xl transition hover:bg-[rgba(58,52,48,0.65)] focus-within:ring-2 focus-within:ring-gold-300";

const TITLE = "Weekly Plans";
const SUBTITLE = "The food, people and moments to capture each week";

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
  const countText = loading
    ? "Loading weekly plans…"
    : data && !error
      ? `${data.total} ${data.total === 1 ? "plan" : "plans"}`
      : "";
  return (
    <OwnLayout>
      <PageHead
        title={TITLE}
        subtitle={SUBTITLE}
        actions={
          <>
            <label htmlFor="shoot-filter" className={glassPill}>
              <ListFilter className="h-5 w-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
              <span className="sr-only">Status</span>
              <select
                id="shoot-filter"
                value={status}
                onChange={(e) => navigate(e.target.value)}
                className="cursor-pointer appearance-none bg-transparent pr-6 outline-none [&>option]:text-stone-900"
              >
                <option value="">All statuses</option>
                {Object.entries(SHOOT_STATUSES).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden="true" />
            </label>
            <DateField
              id="week-filter"
              variant="glass"
              value={week}
              onChange={(v) => navigate(status, 1, v ? startOfWeek(v) : "")}
              placeholder="Week starting"
              ariaLabel="Week starting"
            />
            {week && (
              <button type="button" onClick={() => navigate(status, 1, "")} className={btn.glass}>
                <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                All weeks
              </button>
            )}
            <Link href="/admin/shoot-plans/new" className={btn.primary}>
              <Plus size={18} aria-hidden="true" />
              New weekly plan
            </Link>
          </>
        }
      />

      <Sheet label="Weekly plans" className="overflow-hidden">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-4 pb-3.5 pt-4 md:px-5">
          <h2 className="font-outfit text-xl font-normal tracking-tight text-stone-900">
            {week ? formatWeek(week) : "All weeks"}
          </h2>
          <p className="text-[13px] font-light text-stone-500" role="status">
            {countText}
          </p>
        </div>

        {error ? (
          <div className="px-4 pb-5 md:px-5">
            <div role="alert" className="rounded-[18px] bg-red-50 p-4 text-sm text-red-700">
              {error}
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setRetry((r) => r + 1)} className={btn.light}>
                  Try again
                </button>
                <Link className={btn.light} href="/admin/login" target="_blank" rel="noopener noreferrer">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        ) : loading ? (
          <div role="status">
            <Empty>Loading weekly plans…</Empty>
          </div>
        ) : data?.plans.length ? (
          <>
            <div className="grid gap-3 px-4 pb-4 md:grid-cols-2 md:px-5 md:pb-5 xl:grid-cols-3">
              {data.plans.map((plan) => {
                const hot = plan.status === "in_progress";
                return (
                  <Link
                    href={`/admin/shoot-plans/${plan.id}`}
                    key={plan.id}
                    className={`group flex min-w-0 flex-col rounded-[20px] p-4 text-stone-900 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300 md:px-[18px] ${
                      hot ? "border-[1.5px] border-gold-300 bg-gold-50" : "border border-stone-200 bg-white hover:border-gold-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Tag tone={STATUS_TONE[plan.status]}>{SHOOT_STATUSES[plan.status]}</Tag>
                      <ArrowRight size={18} aria-hidden="true" className="text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-gold-700" />
                    </div>
                    <h3 className="mt-3 break-words text-[17px] font-normal text-stone-900">{plan.title}</h3>
                    <div className="mt-2 flex flex-col gap-1 text-[13px] text-stone-500">
                      <p className="flex items-start gap-1.5">
                        <CalendarDays size={16} className="mt-px shrink-0" strokeWidth={1.5} aria-hidden="true" />
                        <span>{formatWeek(plan.weekStart || startOfWeek(plan.date))}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <MapPin size={16} className="shrink-0" strokeWidth={1.5} aria-hidden="true" />
                        {SHOOT_LOCATIONS[plan.location]}
                      </p>
                    </div>
                    {plan.objective && (
                      <p className="mt-2.5 line-clamp-2 break-words text-[13px] leading-relaxed text-stone-600">{plan.objective}</p>
                    )}
                    <div className="mt-auto pt-3 text-[13px] text-stone-500">
                      {!!plan.activities?.length ? (
                        <>
                          <p className="truncate text-xs text-gold-700">
                            {Array.from(new Set(plan.activities.map((item) => WORK_TYPES[item.type]))).join(" · ")}
                          </p>
                          <p className="mt-1">
                            {plan.activities.filter((item) => item.status === "completed").length} of {plan.activities.length} activities complete
                          </p>
                        </>
                      ) : (
                        <CaptureProgress captured={plan.capturedCount} total={plan.shotCount} />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
            <nav aria-label="Weekly plan pages">
              <SheetFooter>
                <span className="text-stone-500">
                  Page {data.page} of {data.pages}
                </span>
                <button
                  type="button"
                  disabled={data.page <= 1}
                  onClick={() => navigate(status, data.page - 1)}
                  className={`${btn.small} ml-auto disabled:cursor-not-allowed`}
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  Previous
                </button>
                <button
                  type="button"
                  disabled={data.page >= data.pages}
                  onClick={() => navigate(status, data.page + 1)}
                  className="inline-flex h-8 items-center gap-1 rounded-full bg-stone-900 px-3 text-[13px] text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                </button>
              </SheetFooter>
            </nav>
          </>
        ) : (
          <div className="mx-4 mb-5 rounded-[20px] border border-dashed border-stone-200 px-6 py-14 text-center md:mx-5">
            <Camera size={32} aria-hidden="true" className="mx-auto mb-5 text-gold-700" strokeWidth={1.5} />
            <h3 className="text-xl font-normal text-stone-900">
              {status || week ? "No plans match these filters" : "No weekly plans yet"}
            </h3>
            {/* An empty filter offers Show all plans; an empty list offers plan creation. */}
            <div className="mt-6">
              {status || week ? (
                <button type="button" onClick={() => navigate("", 1, "")} className={btn.light}>
                  Show all plans
                </button>
              ) : (
                <Link href="/admin/shoot-plans/new" className={btn.primary}>
                  Create your first weekly plan <ArrowRight size={16} aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>
        )}
      </Sheet>
    </OwnLayout>
  );
}
