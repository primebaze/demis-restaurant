"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ShootPlan } from "@/lib/shoot-plans";
import {
  Action,
  Feedback,
  plannerRequest,
  errorMessage,
  linkClass,
} from "./ShootPlanUI";
import ShootPlanEditor from "./ShootPlanEditor";
export default function ShootPlanDetail({ id }: { id: string }) {
  const [plan, setPlan] = useState<ShootPlan | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setPlan(null);
    plannerRequest<{ plan: ShootPlan }>(
      `/api/admin/shoot-plans/${encodeURIComponent(id)}`,
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) setPlan(data.plan);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(errorMessage(err));
      });
    return () => controller.abort();
  }, [id, retry]);
  if (error)
    return (
      <div className="mx-auto max-w-3xl">
        <Link href="/admin/shoot-plans" className={linkClass}>
          ← Weekly plans
        </Link>
        <Feedback error>
          {error}
          <div className="mt-3 flex flex-wrap gap-3">
            <Action onClick={() => setRetry((r) => r + 1)}>Try again</Action>
            <Link
              href="/admin/login"
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              Sign in
            </Link>
          </div>
        </Feedback>
      </div>
    );
  if (!plan)
    return (
      <p role="status" className="py-16 text-center text-gray-400">
        Loading shoot plan…
      </p>
    );
  return <ShootPlanEditor key={plan.id + plan.version} initial={plan} />;
}
