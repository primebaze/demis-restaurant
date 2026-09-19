import type { Metadata } from "next";
import PublicShootPlan from "@/components/shoot-plans/PublicShootPlan";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Shoot plan | Demi’s",
  description: "Enter your PIN to view the shoot plan shared with you.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
  referrer: "no-referrer",
  alternates: { canonical: null },
  openGraph: {
    title: "Demi’s shoot plan",
    description: "A PIN-protected shoot plan.",
    images: [],
  },
  twitter: {
    title: "Demi’s shoot plan",
    description: "A PIN-protected shoot plan.",
    images: [],
  },
};
export default function PublicShootPage({
  params,
}: {
  params: { token: string };
}) {
  return <PublicShootPlan token={params.token} />;
}
