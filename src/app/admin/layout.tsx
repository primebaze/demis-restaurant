import { Outfit } from "next/font/google";
import AdminShell from "./AdminShell";
import "./admin.css";

const outfit = Outfit({ subsets: ["latin"], weight: ["200", "300", "400", "500"], variable: "--font-outfit", display: "swap" });

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={outfit.variable}>
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
