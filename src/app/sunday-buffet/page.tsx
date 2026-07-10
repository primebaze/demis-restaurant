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

const MENU = ["Jollof rice", "Fried rice", "Rice & peas", "Grilled turkey", "Oxtail", "Beef ribs", "and plenty more"];

const TIERS = [
  { n: "1–20", p: "20", note: "Early birds", highlight: true },
  { n: "21–45", p: "25", note: "Still a steal", highlight: false },
  { n: "46+", p: "30", note: "Latecomers", highlight: false },
];

export default function SundayBuffetPage() {
  return (
    <div className="relative min-h-screen bg-[#0d0c0b] pt-32 pb-24 overflow-hidden">
      {/* warm ambient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-40 h-[520px] bg-[radial-gradient(60%_100%_at_50%_0%,rgba(227,192,122,0.10),transparent_70%)]" />

      <div className="relative mx-auto max-w-6xl px-6">
        {/* Hero */}
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.35em] text-gold-300/90 font-semibold mb-5">Streatham Hill · Every Sunday</p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-white font-[family-name:var(--font-display)] leading-[1.02]">
            Sunday Buffet
          </h1>
          <p className="mt-6 text-lg text-stone-400 max-w-xl mx-auto leading-relaxed">
            All-you-can-eat Afro-Caribbean buffet, every Sunday.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_460px] gap-12 lg:gap-16 items-start">
          {/* ── Info column ── */}
          <div className="space-y-14">
            {/* Pricing */}
            <section>
              <h2 className="text-2xl font-semibold text-white font-[family-name:var(--font-display)]">The earlier you book, the less you pay</h2>
              <p className="mt-2 text-[15px] text-stone-400 leading-relaxed max-w-md">
                Reserving gives you a number for the day. Your number sets your price, and you pay it at the door.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {TIERS.map((t) => (
                  <div
                    key={t.n}
                    className={`rounded-2xl p-5 text-center border transition ${
                      t.highlight
                        ? "border-gold-300/50 bg-gold-300/[0.07]"
                        : "border-white/[0.08] bg-white/[0.02]"
                    }`}
                  >
                    <p className="text-[10px] uppercase tracking-[0.15em] text-stone-500">No. {t.n}</p>
                    <p className={`mt-2 text-3xl font-semibold ${t.highlight ? "text-gold-300" : "text-white"}`}>£{t.p}</p>
                    <p className="mt-1.5 text-[11px] text-stone-500">{t.note}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* What's on */}
            <section>
              <h2 className="text-2xl font-semibold text-white font-[family-name:var(--font-display)]">What&apos;s on the table</h2>
              <p className="mt-2 text-[15px] text-stone-400 leading-relaxed max-w-md">
                A generous run of Nigerian and Caribbean favourites, plus complimentary appetizers to start you off.
              </p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {MENU.map((m) => (
                  <span key={m} className="px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06] text-stone-300 text-[13px]">{m}</span>
                ))}
              </div>
            </section>

            {/* Details */}
            <section className="grid sm:grid-cols-3 gap-6 pt-2">
              {[
                { k: "When", v: ["Every Sunday", "12:30pm – 4:00pm"] },
                { k: "Where", v: ["Demi's, Streatham Hill", "67 Streatham Hill, SW2 4TX"] },
                { k: "Payment", v: ["At the door", "Cash or card"] },
              ].map((d) => (
                <div key={d.k}>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-gold-300/80 mb-2">{d.k}</p>
                  {d.v.map((line, i) => (
                    <p key={i} className={i === 0 ? "text-sm text-white" : "text-xs text-stone-500 mt-0.5"}>{line}</p>
                  ))}
                </div>
              ))}
            </section>
          </div>

          {/* ── Booking ── */}
          <div className="lg:sticky lg:top-28">
            <BuffetBooking />
          </div>
        </div>
      </div>
    </div>
  );
}
