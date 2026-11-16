import { Suspense } from "react";
import ShootPlanList from "@/components/admin/ShootPlanList";
import { OwnLayout, PageHead } from "@/components/admin/ui";
export default function ShootPlansPage() {
  return (
    <Suspense
      fallback={
        <OwnLayout>
          <PageHead title="Weekly Plans" subtitle="The food, people and moments to capture each week" />
          <p role="status" className="py-16 text-center font-light text-white/85">
            Loading shoot plans…
          </p>
        </OwnLayout>
      }
    >
      <ShootPlanList />
    </Suspense>
  );
}
