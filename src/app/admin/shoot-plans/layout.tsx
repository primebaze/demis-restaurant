import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Weekly Plans | Admin",
  robots: { index: false, follow: false },
};
export default function ShootPlansLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
