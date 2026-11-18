import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import localFont from "next/font/local";

// Times and numbers, as in the design (file already in the project).
const geistMono = localFont({ src: "../fonts/GeistMonoVF.woff", variable: "--font-geist-mono", weight: "100 900", display: "swap" });

const outfit = Outfit({ subsets: ["latin"], weight: ["200", "300", "400", "500", "600"], variable: "--font-outfit", display: "swap" });

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
  return <div className={`${outfit.variable} ${geistMono.variable} min-h-dvh bg-ink-950 font-outfit text-white antialiased`}>{children}</div>;
}
