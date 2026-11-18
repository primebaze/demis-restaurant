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

/*
 * Phone fixes for the whole meetings app:
 * - Pop-ups (New meeting, tasks, etc.) scroll on iPhone: they sit above the tab bar, keep the scroll to
 *   themselves, leave room for the notch and home bar, and the page behind stops scrolling while one is open.
 *   Centred pop-ups taller than the screen start at the top instead of being cut off.
 * - Date and time fields shrink to fit like other fields (iPhone gives them a fixed minimum width).
 */
const MOBILE_FIXES = `
[data-overlay]{z-index:1000!important;overflow-y:auto!important;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;align-items:flex-start!important;padding-top:calc(env(safe-area-inset-top) + 16px)!important;padding-bottom:calc(env(safe-area-inset-bottom) + 28px)!important}
[data-overlay]>*{margin-top:auto;margin-bottom:auto;flex-shrink:0}
@media (max-width:640px){[data-overlay]{padding-left:10px!important;padding-right:10px!important}}
html:has([data-overlay]),body:has([data-overlay]){overflow:hidden}
input[type=date],input[type=time]{min-width:0;max-width:100%;-webkit-appearance:none;appearance:none}
input[type=date]::-webkit-date-and-time-value,input[type=time]::-webkit-date-and-time-value{text-align:left}
`;

export default function MeetLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${outfit.variable} ${geistMono.variable} min-h-dvh bg-ink-950 font-outfit text-white antialiased`}>
      <style dangerouslySetInnerHTML={{ __html: MOBILE_FIXES }} />
      {children}
    </div>
  );
}
