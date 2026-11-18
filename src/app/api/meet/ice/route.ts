import { NextResponse } from "next/server";
import { requireMeet } from "@/lib/meet-auth";

export const dynamic = "force-dynamic";

const STUN = [{ urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] }];

/**
 * GET: connection helpers for a call. Always public STUN; plus a Cloudflare TURN relay
 * (for awkward networks like mobile data) when TURN_KEY_ID and TURN_KEY_TOKEN are set in Vercel.
 */
export async function GET() {
  const me = await requireMeet();
  if (!me) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const id = process.env.TURN_KEY_ID;
  const token = process.env.TURN_KEY_TOKEN;
  if (!id || !token) return NextResponse.json({ iceServers: STUN, relay: false }, { headers: { "Cache-Control": "no-store" } });
  try {
    const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(id)}/credentials/generate-ice-servers`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ttl: 6 * 3600 }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const servers = Array.isArray(data.iceServers) ? data.iceServers : data.iceServers ? [data.iceServers] : [];
    return NextResponse.json({ iceServers: [...STUN, ...servers], relay: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ iceServers: STUN, relay: false }, { headers: { "Cache-Control": "no-store" } });
  }
}
