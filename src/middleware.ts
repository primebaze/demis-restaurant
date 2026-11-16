import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

/** The staff meetings app's own address. Only the meetings app is served there. */
const MEETING_HOST = "meeting.demisrestaurant.co.uk";

/** Paths the meetings app needs on its own address. Everything else there is 404. */
function isMeetPath(pathname: string) {
  return (
    pathname === "/meet" ||
    pathname.startsWith("/meet/") ||
    pathname.startsWith("/api/meet/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/icon.svg" ||
    pathname === "/favicon.ico"
  );
}

function meetingHost(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/") return NextResponse.redirect(new URL("/meet", req.url), 307);
  if (isMeetPath(pathname)) {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }
  return new NextResponse("Not found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" },
  });
}

/** The live site never serves the meetings app; only its own address does (local dev allowed). */
function meetOnMainSite(req: NextRequest) {
  const host = req.nextUrl.hostname;
  const { pathname } = req.nextUrl;
  const isMeet = pathname === "/meet" || pathname.startsWith("/meet/") || pathname.startsWith("/api/meet/");
  return isMeet && host.endsWith("demisrestaurant.co.uk");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (req.nextUrl.hostname === MEETING_HOST || req.headers.get("host")?.split(":")[0] === MEETING_HOST) {
    return meetingHost(req);
  }
  if (meetOnMainSite(req)) return new NextResponse("Not found", { status: 404 });

  // Protect admin routes (except /admin/login)
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const token = req.cookies.get("admin_token")?.value;

    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    try {
      const secret = process.env.ADMIN_JWT_SECRET;
      if (!secret) {
        return NextResponse.redirect(new URL("/admin/login", req.url));
      }
      await jwtVerify(token, new TextEncoder().encode(secret));
    } catch {
      // Invalid or expired token
      const response = NextResponse.redirect(new URL("/admin/login", req.url));
      response.cookies.delete("admin_token");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/meet",
    "/meet/:path*",
    "/api/meet/:path*",
    // Everything on the meetings address (and only there), so the main site never shows on it.
    { source: "/:path*", has: [{ type: "host", value: "meeting.demisrestaurant.co.uk" }] },
  ],
};
