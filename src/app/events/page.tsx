import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Events | Demi's Restaurant",
  description:
    "Live music, Afrobeats nights, weekend brunch, private hire and celebrations at Demi's Nigerian Restaurant in London. See what's on at Cricklewood and Streatham Hill.",
  keywords: [
    "Demi's events",
    "Nigerian restaurant events London",
    "Afrobeats night London",
    "private hire Nigerian restaurant",
    "weekend brunch London",
    "Cricklewood events",
    "Streatham events",
  ],
  openGraph: {
    title: "Events | Demi's Restaurant",
    description:
      "Live music, Afrobeats nights, weekend brunch, private hire and celebrations at Demi's Nigerian Restaurant in London.",
  },
  alternates: {
    canonical: "https://www.demisrestaurant.co.uk/events",
  },
};

export default function EventsPage() {
  return (
    <>
      {/* ─── HERO ─── */}
      <section className="relative h-[60vh] sm:h-[70vh] lg:h-[75vh] overflow-hidden">
        <img
          src="/events.jpeg"
          alt="Events at Demi's Restaurant"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-gold-300">What&apos;s On</p>
          <h1 className="mt-3 text-4xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tight">
            Events at Demi&apos;s
          </h1>
          <p className="mt-4 text-sm sm:text-base lg:text-lg text-white/60 max-w-md lg:max-w-lg">
            Live music, celebrations, and unforgettable nights out.
          </p>
        </div>
      </section>

      {/* ─── RECURRING EVENTS ─── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12">
            <p className="section-label">Every Week</p>
            <h2 className="mt-3 heading-lg">Our regular nights.</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Afrobeats Friday */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#222] p-8 sm:p-10">
              <div className="flex items-center gap-3 mb-5">
                <span className="text-3xl">🎵</span>
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gold-300">Every Friday</p>
                  <p className="text-xs text-stone-500">8 PM &ndash; Late</p>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white">Live Afrobeats Night</h3>
              <p className="mt-1 text-sm font-semibold text-gold-300">with Deejay Why</p>
              <p className="mt-3 text-sm text-stone-400 leading-relaxed">
                The weekend starts here. Deejay Why spins the best Afrobeats, Amapiano and
                Afro-fusion tracks while you enjoy cocktails and our full dinner menu. The vibe
                is electric, the food is fire, and the dance floor is calling.
              </p>
              <a
                href="/booking"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold-300 px-6 py-2.5 text-xs font-bold text-[#1a1a1a] hover:bg-gold-200 transition-all"
              >
                Book a Table &rarr;
              </a>
              <div className="mt-5 flex items-center gap-4">
                <span className="inline-flex items-center rounded-full bg-gold-300/10 px-3 py-1 text-xs font-medium text-gold-300">Cricklewood</span>
                <span className="inline-flex items-center rounded-full bg-gold-300/10 px-3 py-1 text-xs font-medium text-gold-300">Streatham Hill</span>
              </div>
            </div>

            {/* Weekend Brunch */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#222] p-8 sm:p-10">
              <div className="flex items-center gap-3 mb-5">
                <span className="text-3xl">🍳</span>
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gold-300">Saturdays &amp; Sundays</p>
                  <p className="text-xs text-stone-500">11 AM &ndash; 3 PM</p>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white">Weekend Brunch</h3>
              <p className="mt-3 text-sm text-stone-400 leading-relaxed">
                Start your weekend right with our Nigerian brunch menu. Akara, perfectly fried
                plantain, scrambled eggs with peppers, fresh smoothies and bottomless
                Chapman cocktails. Bring the family or come with friends.
              </p>
              <div className="mt-5 flex items-center gap-4">
                <span className="inline-flex items-center rounded-full bg-gold-300/10 px-3 py-1 text-xs font-medium text-gold-300">Both Locations</span>
              </div>
            </div>

            {/* Suya Sundays */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#222] p-8 sm:p-10">
              <div className="flex items-center gap-3 mb-5">
                <span className="text-3xl">🔥</span>
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gold-300">Every Sunday</p>
                  <p className="text-xs text-stone-500">4 PM &ndash; 10 PM</p>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white">Suya Sundays</h3>
              <p className="mt-3 text-sm text-stone-400 leading-relaxed">
                Wind down the weekend with our signature suya &mdash; char-grilled, perfectly
                spiced and served with all the sides. Enjoy special pricing on suya platters,
                cold drinks and good conversations.
              </p>
              <div className="mt-5 flex items-center gap-4">
                <span className="inline-flex items-center rounded-full bg-gold-300/10 px-3 py-1 text-xs font-medium text-gold-300">Cricklewood</span>
              </div>
            </div>

            {/* Live Band Night */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#222] p-8 sm:p-10">
              <div className="flex items-center gap-3 mb-5">
                <span className="text-3xl">🎸</span>
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gold-300">Last Saturday of Month</p>
                  <p className="text-xs text-stone-500">7 PM &ndash; Late</p>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white">Live Band Night</h3>
              <p className="mt-3 text-sm text-stone-400 leading-relaxed">
                Live highlife, jùjú, and Afrobeat classics performed by some of London&apos;s
                finest musicians. A special set menu is available alongside our regular menu.
                Book early &mdash; these nights always sell out.
              </p>
              <div className="mt-5 flex items-center gap-4">
                <span className="inline-flex items-center rounded-full bg-gold-300/10 px-3 py-1 text-xs font-medium text-gold-300">Streatham Hill</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PRIVATE HIRE ─── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-2xl bg-white py-14 sm:py-16 px-6 sm:px-12">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.3em] uppercase text-gold-600">Private Hire</p>
                <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight leading-tight">
                  Your celebration,<br />our space.
                </h2>
                <p className="mt-4 text-sm text-stone-500 leading-relaxed">
                  From milestone birthdays to corporate dinners, baby showers to wedding receptions
                  &mdash; Demi&apos;s is the perfect venue. We offer exclusive-use hire at both
                  locations, with bespoke menus, decorations, and entertainment to suit your event.
                </p>
                <div className="mt-7 flex items-center gap-3 flex-wrap">
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-7 py-3 text-sm font-semibold text-white hover:bg-stone-800 transition-all"
                  >
                    Enquire Now
                  </Link>
                  <a
                    href="tel:02039046977"
                    className="inline-flex items-center gap-2 rounded-full border-2 border-stone-300 px-7 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-100 transition-all"
                  >
                    Call Us
                  </a>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <span className="text-xl mt-0.5">🎂</span>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">Birthdays &amp; Milestones</p>
                    <p className="text-sm text-stone-500">Custom menus, decorations, and dedicated service.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="text-xl mt-0.5">💼</span>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">Corporate Events</p>
                    <p className="text-sm text-stone-500">Team lunches, client dinners, and networking evenings.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="text-xl mt-0.5">💒</span>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">Weddings &amp; Receptions</p>
                    <p className="text-sm text-stone-500">Intimate ceremonies and reception dinners for up to 80 guests.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="text-xl mt-0.5">🎉</span>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">Cultural Celebrations</p>
                    <p className="text-sm text-stone-500">Naming ceremonies, graduations, and family gatherings.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-3xl lg:max-w-4xl px-6 text-center">
          <p className="section-label">Don&apos;t Miss Out</p>
          <h2 className="mt-3 heading-lg">Follow us for updates.</h2>
          <p className="mt-5 body-text max-w-lg mx-auto">
            Our events fill up fast. Follow us on Instagram for announcements,
            behind-the-scenes, and ticket releases.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <a
              href="https://www.instagram.com/demisrestaurant/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold"
            >
              Follow @demisrestaurant
            </a>
            <Link href="/contact" className="btn-outline-white">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
