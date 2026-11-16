import type { Viewport } from "next";
import { Outfit } from "next/font/google";
import AdminShell from "./AdminShell";
import "./admin.css";

// Admin is an app used on phones and iPads: stop Safari zooming the page in when a
// box is tapped (it does that for text under 16px and leaves the page zoomed and cut off).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1a1a1a",
};

const outfit = Outfit({ subsets: ["latin"], weight: ["200", "300", "400", "500"], variable: "--font-outfit", display: "swap" });

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`admin-root ${outfit.variable}`}>
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
