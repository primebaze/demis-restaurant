import ShootPlanDetail from "@/components/admin/ShootPlanDetail";
export default function ShootPage({ params }: { params: { id: string } }) {
  return <ShootPlanDetail id={params.id} />;
}
