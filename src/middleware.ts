import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

/** The staff meetings app's own address. Only the meetings app is served there. */
const MEETING_HOST = "meeting.demisrestaurant.co.uk";

// Holding page until the meetings app is built. Plain HTML so nothing from the
// main site (pages, admin, booking) is ever reachable on the meetings address.
const MEETING_SOON = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">
<title>Demi's Meetings</title><style>
html,body{margin:0;height:100%;background:#141110;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}
main{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;box-sizing:border-box}
h1{font-weight:300;font-size:34px;letter-spacing:-0.02em;margin:0 0 10px}p{margin:0;color:rgba(255,255,255,.65);font-size:16px}
</style></head><body><main><h1>Demi&rsquo;s Meetings</h1><p>Coming soon.</p></main></body></html>`;

function meetingHost(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const headers = { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" };
  if (pathname === "/") return new NextResponse(MEETING_SOON, { status: 200, headers });
  return new NextResponse("Not found", { status: 404, headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" } });
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (req.nextUrl.hostname === MEETING_HOST || req.headers.get("host")?.split(":")[0] === MEETING_HOST) {
    return meetingHost(req);
  }

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
    // Everything on the meetings address (and only there), so the main site never shows on it.
    { source: "/:path*", has: [{ type: "host", value: "meeting.demisrestaurant.co.uk" }] },
  ],
};
