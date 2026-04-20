import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cricklewood Broadway | Demi's Restaurant",
  description:
    "Visit Demi's Nigerian Restaurant at 89 Cricklewood Broadway, London NW2 3JG. Nigerian cuisine in North West London. Directions, parking info and opening hours.",
  keywords: [
    "Demi's Cricklewood",
    "Nigerian restaurant Cricklewood",
    "African restaurant NW2",
    "Cricklewood Broadway restaurant",
    "Nigerian food North West London",
  ],
  openGraph: {
    title: "Cricklewood Broadway | Demi's Restaurant",
    description:
      "Visit Demi's Nigerian Restaurant at 89 Cricklewood Broadway, London NW2 3JG. Nigerian cuisine in North West London.",
  },
  alternates: {
    canonical: "https://demisrestaurant.co.uk/locations/cricklewood",
  },
};

export default function CricklewoodPage() {
  return (
    <>
      {/* ─── HERO ─── */}
      <section className="relative h-[60vh] sm:h-[70vh] overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/hero.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-gold-300">Our Location</p>
          <h1 className="mt-3 text-4xl sm:text-6xl font-bold text-white tracking-tight">
            Cricklewood Broadway
          </h1>
          <p className="mt-4 text-sm sm:text-base text-white/60 max-w-md">
            Our flagship restaurant in the heart of North West London.
          </p>
        </div>
      </section>

      {/* ─── ABOUT THIS BRANCH ─── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-6">
          <p className="section-label">About This Branch</p>
          <h2 className="mt-4 heading-lg">
            Where it all began.
          </h2>
          <p className="mt-6 body-text leading-relaxed">
            Demi&apos;s Cricklewood is where our story started &mdash; a warm, welcoming
            space on one of North London&apos;s most vibrant high streets. Our Cricklewood
            branch serves the full menu of classic Nigerian dishes, from smoky jollof
            rice and perfectly grilled suya to rich egusi soup and fluffy pounded yam.
          </p>
          <p className="mt-4 body-text leading-relaxed">
            Whether you&apos;re popping in for a quick lunch, celebrating with family,
            or ordering bulk for a party, Cricklewood has you covered. The space is
            perfect for intimate dinners and larger gatherings alike, with private hire
            available for special events.
          </p>
        </div>
      </section>

      {/* ─── DETAILS GRID ─── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Address & Hours */}
            <div>
              <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-gold-300">Address</p>
              <address className="mt-3 text-sm text-stone-300 not-italic leading-relaxed">
                89 Cricklewood Broadway<br />
                London NW2 3JG
              </address>
              <p className="mt-5 text-[10px] font-semibold tracking-[0.25em] uppercase text-gold-300">Opening Hours</p>
              <p className="mt-3 text-sm text-stone-300 leading-relaxed">
                Monday &ndash; Sunday<br />
                12:00 PM &ndash; Late
              </p>
              <p className="mt-5 text-[10px] font-semibold tracking-[0.25em] uppercase text-gold-300">Contact</p>
              <p className="mt-3 text-sm text-stone-300">
                <a href="tel:02039046977" className="hover:text-white transition-colors">020 3904 6977</a>
              </p>
              <p className="text-sm text-stone-300">
                <a href="mailto:bookings@demisrestaurant.co.uk" className="hover:text-white transition-colors">bookings@demisrestaurant.co.uk</a>
              </p>
            </div>

            {/* Getting Here */}
            <div>
              <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-gold-300">Getting Here</p>
              <div className="mt-3 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-white">By Train</p>
                  <p className="text-sm text-stone-400 leading-relaxed">
                    Cricklewood station (Thameslink) is a 3-minute walk. Direct trains from
                    St Pancras, Kentish Town and West Hampstead.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">By Bus</p>
                  <p className="text-sm text-stone-400 leading-relaxed">
                    Buses 16, 32, 189, 245, and 260 all stop on Cricklewood Broadway,
                    directly outside the restaurant.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">By Tube</p>
                  <p className="text-sm text-stone-400 leading-relaxed">
                    Kilburn station (Jubilee line) is a 10-minute walk. Willesden Green
                    is also nearby.
                  </p>
                </div>
              </div>
            </div>

            {/* Parking */}
            <div>
              <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-gold-300">Parking</p>
              <div className="mt-3 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-white">On-Street Parking</p>
                  <p className="text-sm text-stone-400 leading-relaxed">
                    Pay &amp; display bays are available along Cricklewood Broadway and
                    surrounding residential streets. Free after 6:30 PM and on Sundays.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Nearby Car Parks</p>
                  <p className="text-sm text-stone-400 leading-relaxed">
                    Morrisons car park on Cricklewood Lane (5-minute walk) offers
                    affordable hourly rates. Additional parking at Brent Cross
                    Shopping Centre (10-minute drive).
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Accessibility</p>
                  <p className="text-sm text-stone-400 leading-relaxed">
                    Step-free access at the entrance. The restaurant is fully
                    wheelchair accessible.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MAP ─── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-2xl overflow-hidden h-[350px] sm:h-[450px]">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2480.7!2d-0.2135!3d51.5555!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNTHCsDMzJzIwLjAiTiAwwrAxMic0OC42Ilc!5e0!3m2!1sen!2suk!4v1"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Demi's Cricklewood location on Google Maps"
            />
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-2xl bg-white py-14 sm:py-16 px-6 text-center">
            <h2 className="text-2xl sm:text-4xl font-bold text-stone-900 tracking-tight">
              Ready to visit Cricklewood?
            </h2>
            <p className="mt-4 text-sm text-stone-500 max-w-md mx-auto leading-relaxed">
              Walk-ins welcome. For groups of 6+, we recommend booking ahead.
            </p>
            <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
              <a
                href="/booking"
                className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-7 py-3 text-sm font-semibold text-white hover:bg-stone-800 transition-all"
              >
                Reserve a Table
              </a>
              <a
                href="https://www.google.com/maps/search/89+Cricklewood+Broadway+London+NW2+3JG"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border-2 border-stone-300 px-7 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-100 transition-all"
              >
                Get Directions
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
