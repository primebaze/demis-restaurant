import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";

const outfit = Outfit({ subsets: ["latin"], weight: ["200", "300", "400", "500"], variable: "--font-outfit", display: "swap" });

export const metadata: Metadata = {
  title: { absolute: "Demi's Meetings" },
  description: "Rota, tasks, news and meetings for the Demi's team",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
  manifest: "/meet/manifest.webmanifest",
  icons: { apple: "/meet/apple-touch-icon.png", icon: "/meet/icon-192.png" },
  appleWebApp: { capable: true, title: "Demi's", statusBarStyle: "black-translucent" },
  openGraph: null,
  twitter: null,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#111111",
};

export default function MeetLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${outfit.variable} min-h-dvh bg-ink-950 font-outfit text-white antialiased`}>{children}</div>;
}
