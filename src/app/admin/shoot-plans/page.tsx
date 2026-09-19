import { Suspense } from "react";
import ShootPlanList from "@/components/admin/ShootPlanList";
export default function ShootPlansPage() {
  return (
    <Suspense fallback={<p role="status">Loading shoot plans…</p>}>
      <ShootPlanList />
    </Suspense>
  );
}
