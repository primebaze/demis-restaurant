import { NextResponse } from "next/server";
import { currentMeetState } from "@/lib/meet-auth";
import { getClockedIn } from "@/lib/clockin";

export const dynamic = "force-dynamic";

/** GET: where this phone stands (signed out, waiting for approval, declined, or in), plus Home basics. */
export async function GET() {
  const s = await currentMeetState().catch(() => null);
  const headers = { "Cache-Control": "no-store" };
  if (!s) return NextResponse.json({ state: "error" }, { status: 502, headers });
  if (s.state !== "approved") return NextResponse.json(s, { headers });

  const since = await getClockedIn().then((m) => m.get(s.person.id) ?? null).catch(() => null);
  return NextResponse.json(
    {
      state: "approved",
      person: { id: s.person.id, name: s.person.name, role: s.person.role },
      manager: s.manager,
      branch: s.branch,
      notifyChoice: s.notifyChoice,
      clockedInSince: since,
    },
    { headers },
  );
}
