import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Streatham Hill | Demi's Restaurant",
  description:
    "Visit Demi's Nigerian Restaurant at 67 Streatham Hill, London SW2 4TX. Nigerian cuisine in South London. Directions, parking info and opening hours.",
  keywords: [
    "Demi's Streatham",
    "Nigerian restaurant Streatham",
    "African restaurant SW2",
    "Streatham Hill restaurant",
    "Nigerian food South London",
  ],
  openGraph: {
    title: "Streatham Hill | Demi's Restaurant",
    description:
      "Visit Demi's Nigerian Restaurant at 67 Streatham Hill, London SW2 4TX. Nigerian cuisine in South London.",
  },
  alternates: {
    canonical: "https://www.demisrestaurant.co.uk/locations/streatham",
  },
};

export default function StreathamPage() {
  return (
    <>
      {/* ─── HERO ─── */}
      <section className="relative h-[60vh] sm:h-[70vh] overflow-hidden">
        <img
          src="/her0-streatham.jpeg"
          alt="Demi's Restaurant Streatham Hill"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-gold-300">Our Location</p>
          <h1 className="mt-3 text-4xl sm:text-6xl font-bold text-white tracking-tight">
            Streatham Hill
          </h1>
          <p className="mt-4 text-sm sm:text-base text-white/60 max-w-md">
            Bringing real Nigerian flavours to South London.
          </p>
        </div>
      </section>

      {/* ─── ABOUT THIS BRANCH ─── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-6">
          <p className="section-label">About This Branch</p>
          <h2 className="mt-4 heading-lg">
            Nigerian flavours, South London style.
          </h2>
          <p className="mt-6 body-text leading-relaxed">
            Our Streatham Hill branch brings the full Demi&apos;s experience to South London.
            Located on the bustling Streatham Hill high street, this location serves
            the same beloved dishes &mdash; smoky jollof rice, fiery suya, hearty
            egusi soup, and our signature pounded yam &mdash; in a warm and
            welcoming setting.
          </p>
          <p className="mt-4 body-text leading-relaxed">
            Whether you&apos;re a local looking for your new favourite spot or
            travelling across London for the real thing, Streatham Hill has
            everything you love about Demi&apos;s. Dine in, take away, or book
            the space for private events and celebrations.
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
                67 Streatham Hill<br />
                London SW2 4TX
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
                    Streatham Hill station (Southern) is a 2-minute walk. Direct services
                    from London Victoria and London Bridge.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">By Bus</p>
                  <p className="text-sm text-stone-400 leading-relaxed">
                    Buses 59, 109, 118, 133, 137, 159, 250, and 333 all serve
                    Streatham Hill, with stops right outside.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">By Tube</p>
                  <p className="text-sm text-stone-400 leading-relaxed">
                    Brixton station (Victoria line) is a 10-minute bus ride. Balham
                    station (Northern line) is also accessible.
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
                    Metered bays are available along Streatham Hill and side streets.
                    Free parking after 6:30 PM Monday to Saturday, and all day Sunday.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Nearby Car Parks</p>
                  <p className="text-sm text-stone-400 leading-relaxed">
                    Streatham Ice &amp; Leisure Centre car park is a short walk away
                    with affordable rates. Additional parking at Streatham Hub retail park.
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
              src="https://www.google.com/maps?q=Streatham+Hill,+London&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Demi's Streatham Hill location on Google Maps"
            />
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-2xl bg-white py-14 sm:py-16 px-6 text-center">
            <h2 className="text-2xl sm:text-4xl font-bold text-stone-900 tracking-tight">
              Ready to visit Streatham Hill?
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
                href="https://www.google.com/maps/search/67+Streatham+Hill+London+SW2+4TX"
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
