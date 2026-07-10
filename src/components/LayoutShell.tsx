"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/Footer";
import { FloatingMenu } from "@/components/FloatingMenu";
import { LiveChat } from "@/components/LiveChat";

const ADMIN_PREFIXES = ["/admin", "/blog/admin", "/checkin"];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = ADMIN_PREFIXES.some((p) => pathname.startsWith(p));

  return (
    <>
      <main>{children}</main>
      {!isAdmin && <Footer />}
      {!isAdmin && <FloatingMenu />}
      {!isAdmin && <LiveChat />}
    </>
  );
}
