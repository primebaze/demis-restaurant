import { prisma } from "@/lib/prisma";
import { prettyDate } from "@/lib/sunday-buffet";
import { ConfirmClient } from "./ConfirmClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Confirm your Sunday buffet spot | Demi's", robots: { index: false } };

export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const t = String(token || "").trim();

  const booking = t
    ? await prisma.sundayBuffetBooking.findFirst({
        where: { confirmToken: t },
        select: { name: true, date: true, status: true, confirmedAt: true },
      })
    : null;

  const valid = booking && booking.status !== "cancelled";

  return (
    <main className="min-h-screen bg-[#0b0b0b] flex items-center justify-center px-5 py-20">
      <div className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-transparent p-8 sm:p-10 shadow-[0_24px_70px_-30px_rgba(0,0,0,0.9)]">
        {valid ? (
          <ConfirmClient
            token={t}
            name={booking!.name}
            prettyDate={prettyDate(booking!.date)}
            alreadyConfirmed={!!booking!.confirmedAt}
          />
        ) : (
          <div className="text-center">
            <p className="text-2xl font-semibold text-white font-[family-name:var(--font-display)]">Link not valid</p>
            <p className="mt-3 text-stone-400">We couldn&rsquo;t find this reservation. It may have been cancelled, or the link is out of date.</p>
            <a href="/sunday-buffet" className="mt-6 inline-block text-sm text-gold-300 hover:text-gold-200 transition">Back to the Sunday buffet →</a>
          </div>
        )}
      </div>
    </main>
  );
}
