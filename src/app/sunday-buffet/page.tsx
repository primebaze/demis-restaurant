import type { Metadata } from "next";
import { BuffetBooking } from "./BuffetBooking";

export const metadata: Metadata = {
  title: "Sunday Buffet | Demi's Restaurant Streatham Hill",
  description:
    "All-you-can-eat Afro-Caribbean Sunday buffet at Demi's Streatham Hill. Reserve your spot, the earlier you book, the lower your number and the less you pay. £20 for the first 20, then £25, then £30.",
  alternates: { canonical: "https://www.demisrestaurant.co.uk/sunday-buffet" },
  openGraph: {
    title: "Sunday Buffet at Demi's, Streatham Hill",
    description: "All-you-can-eat Nigerian & Caribbean buffet. Reserve your spot and pay less the earlier you book.",
    url: "https://www.demisrestaurant.co.uk/sunday-buffet",
    images: [{ url: "/streatham.jpeg" }],
  },
};

export const dynamic = "force-dynamic";

const MENU = ["Jollof rice", "Fried rice", "Rice and peas", "Grilled turkey", "Oxtail", "Beef ribs", "and plenty more"];

export default function SundayBuffetPage() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] pt-32 pb-20">
      <div className="mx-auto max-w-5xl px-6">
        {/* Hero */}
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.3em] text-gold-300 font-semibold mb-4">Streatham Hill · Every Sunday</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white font-[family-name:var(--font-display)] leading-tight">
            Sunday Buffet
          </h1>
          <p className="mt-5 text-lg text-stone-400 max-w-2xl mx-auto">
            All-you-can-eat Afro-Caribbean home cooking, Nigerian and Caribbean side by side, and we switch the menu up every week.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-start">
          {/* Info */}
          <div className="space-y-8">
            {/* How pricing works */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-3 font-[family-name:var(--font-display)]">The earlier you book, the less you pay</h2>
              <p className="text-sm text-stone-400 mb-4">
                Reserving gives you a number for the day. Your number decides your price, and you pay it at the door.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { n: "1–20", p: "£20" },
                  { n: "21–45", p: "£25" },
                  { n: "46+", p: "£30" },
                ].map((t) => (
                  <div key={t.n} className="rounded-xl border border-white/10 bg-[#151310] p-4 text-center">
                    <p className="text-[11px] uppercase tracking-wide text-stone-500">No. {t.n}</p>
                    <p className="text-2xl font-bold text-gold-300 mt-1">{t.p}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-stone-500 mt-3">Book No. 1 and you pay £20. Simple as that.</p>
            </div>

            {/* What's on */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-3 font-[family-name:var(--font-display)]">What&apos;s on the table</h2>
              <p className="text-sm text-stone-400 mb-3">
                A spread of Nigerian and Caribbean favourites, plus complimentary appetizers to start you off.
              </p>
              <div className="flex flex-wrap gap-2">
                {MENU.map((m) => (
                  <span key={m} className="px-3 py-1.5 rounded-full bg-white/5 text-stone-300 text-xs">{m}</span>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="text-sm text-stone-400 space-y-1 pt-2">
              <p><span className="text-stone-500">When:</span> Every Sunday, 12:30pm – 4:00pm</p>
              <p><span className="text-stone-500">Where:</span> Demi&apos;s, 67 Streatham Hill, London SW2 4TX</p>
              <p><span className="text-stone-500">Payment:</span> At the door, cash or card</p>
            </div>
          </div>

          {/* Booking */}
          <div className="lg:sticky lg:top-28">
            <BuffetBooking />
          </div>
        </div>
      </div>
    </div>
  );
}
