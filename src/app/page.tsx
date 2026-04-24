import Image from "next/image";
import Link from "next/link";

// SERVER COMPONENT — fully rendered HTML for maximum SEO
export default function HomePage() {
  return (
    <>
      <link rel="preload" href="/og-image.jpg" as="image" />
      {/* ─── TOP ANNOUNCEMENT BAR ─── */}
      <div className="bg-white lg:hidden">
        <div className="py-3 sm:py-3.5 text-center">
          <p className="text-[11px] sm:text-xs font-semibold tracking-[0.3em] uppercase text-stone-900">
            Dine With Us!
          </p>
        </div>
      </div>

      {/* ─── VIDEO HERO: OG image paints first, video covers when ready */}
      <section className="relative h-[100svh] overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/og-image.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/og-image.jpg"
          aria-hidden="true"
          className="absolute inset-0 z-[1] h-full w-full object-cover"
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 z-[2] bg-black/55" />

        <div className="absolute inset-0 z-[3] flex flex-col items-center justify-center px-6 text-center">
          <h1 className="text-white">
            <span className="block text-[clamp(2.8rem,10vw,5.5rem)] font-bold uppercase tracking-[0.04em] leading-[1]">
              DEMI<span className="inline-block text-[0.22em] align-top relative -top-[0.05em] mx-[-0.02em]">🌶️</span>S
            </span>
            <span className="block text-[clamp(0.65rem,1.6vw,0.8rem)] tracking-[0.45em] uppercase font-light mt-3 text-gold-300">
              Nigerian Restaurant
            </span>
          </h1>

          <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/booking"
              className="btn-gold"
            >
              Reserve a Table
            </Link>
            <Link href="/menu" className="btn-outline-white">
              View Menu
            </Link>
          </div>
        </div>
      </section>

      {/* ─── ABOUT ─── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-3xl lg:max-w-4xl px-6 text-center">
          <p className="section-label">Our Story</p>
          <h2 className="mt-4 heading-lg">
            A taste of Nigeria, in the heart of London.
          </h2>
          <p className="mt-6 body-text max-w-2xl mx-auto">
            Demi&apos;s was born from a deep love for Nigerian food and a desire to share it with
            London. Our kitchen is led by experienced chefs who bring generations of culinary knowledge to
            every dish &mdash; from the smoky depth of our jollof rice to the fiery kick of our suya.
          </p>
          <Link href="/about" className="btn-outline-white mt-8">
            Learn more <span>&rarr;</span>
          </Link>
        </div>
      </section>

      {/* ─── TWO FEATURE CARDS ─── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-5">
            {/* Bulk Order card */}
            <div className="group relative rounded-[1.75rem] border border-white/[0.08] bg-gradient-to-br from-[#2c2c2c] to-[#1e1e1e] p-8 sm:p-10 overflow-hidden transition-all duration-300 hover:border-gold-300/20 hover:shadow-[0_0_40px_-12px_rgba(232,204,156,0.15)]">
              <div className="absolute top-0 right-0 w-48 h-48 bg-gold-300/[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gold-300/10 flex items-center justify-center mb-7">
                  <svg className="text-gold-300" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight">
                  Order bulk<br />meals.
                </h3>
                <p className="mt-4 text-sm text-stone-400 leading-relaxed max-w-[280px]">
                  Small, medium, or large portions delivered fresh to your home or office. Perfect for family dinners, parties, or work events.</p>
                <span
                  className="mt-7 inline-flex items-center gap-2 rounded-full bg-gold-300/40 px-6 py-2.5 text-sm font-semibold text-stone-900/50 cursor-not-allowed"
                >
                  Coming Soon
                </span>
              </div>
            </div>

            {/* Dine In card */}
            <div className="group relative rounded-[1.75rem] border border-white/[0.08] bg-gradient-to-br from-[#2c2c2c] to-[#1e1e1e] p-8 sm:p-10 overflow-hidden transition-all duration-300 hover:border-gold-300/20 hover:shadow-[0_0_40px_-12px_rgba(232,204,156,0.15)]">
              <div className="absolute top-0 right-0 w-48 h-48 bg-gold-300/[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gold-300/10 flex items-center justify-center mb-7">
                  <svg className="text-gold-300" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight">
                  Dine with us<br />in person.
                </h3>
                <p className="mt-4 text-sm text-stone-400 leading-relaxed max-w-[280px]">
                  Visit Demi&apos;s Restaurant London for the full experience — rich flavours, warm atmosphere.
                </p>
                <Link
                  href="/booking"
                  className="mt-7 inline-flex items-center gap-2 rounded-full bg-gold-300 px-6 py-2.5 text-sm font-semibold text-stone-900 hover:bg-gold-200 transition-all"
                >
                  Reserve a table <span>&rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── LOCATIONS ─── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10">
            <p className="section-label">Our Locations</p>
            <h2 className="mt-3 heading-lg">Find us in London.</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Cricklewood — static image avoids a second ~15MB video download */}
            <div className="relative rounded-2xl overflow-hidden h-[340px] sm:h-[380px]">
              <Image
                src="/events.jpeg"
                alt="Demi's Restaurant Cricklewood"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/60" />
              <div className="absolute inset-0 p-7 sm:p-9 flex flex-col justify-end text-white">
                <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-gold-300">Now Open</p>
                <h3 className="mt-2 text-xl sm:text-2xl font-bold leading-tight">
                  Cricklewood Broadway
                </h3>
                <address className="mt-2 text-sm text-white/60 not-italic">
                  89 Cricklewood Broadway, London NW2 3JG
                </address>
                <p className="mt-1 text-sm text-white/50">
                  Mon &ndash; Sun &middot; 12 PM &ndash; Late
                </p>
                <Link href="/locations/cricklewood" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-gold-300 hover:text-gold-200 transition-colors">
                  View Location <span>&rarr;</span>
                </Link>
              </div>
            </div>

            {/* Streatham */}
            <div className="relative rounded-2xl overflow-hidden h-[340px] sm:h-[380px]">
              <Image
                src="/streatham.jpeg"
                alt="Demi's Restaurant Streatham Hill"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/60" />
              <div className="absolute inset-0 p-7 sm:p-9 flex flex-col justify-end text-white">
                <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-gold-300">Now Open</p>
                <h3 className="mt-2 text-xl sm:text-2xl font-bold leading-tight">
                  Streatham Hill
                </h3>
                <address className="mt-2 text-sm text-white/60 not-italic">
                  67 Streatham Hill, London SW2 4TX
                </address>
                <p className="mt-1 text-sm text-white/50">
                  Mon &ndash; Sun &middot; 12 PM &ndash; Late
                </p>
                <Link href="/locations/streatham" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-gold-300 hover:text-gold-200 transition-colors">
                  View Location <span>&rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── BULK ORDER PROMO (light card) ─── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="card-light">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Left — sizes */}
              <div>
                <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                  <div>
                    <p className="text-[clamp(1.25rem,2.5vw,3rem)] font-bold text-stone-900">Small</p>
                    <p className="text-xs text-stone-500 mt-1">4l</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">3–5 people</p>
                  </div>
                  <div>
                    <p className="text-[clamp(1.25rem,2.5vw,3rem)] font-bold text-gold-600">Medium</p>
                    <p className="text-xs text-stone-500 mt-1">7l</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">6–10 people</p>
                  </div>
                  <div>
                    <p className="text-[clamp(1.25rem,2.5vw,3rem)] font-bold text-stone-900">Large</p>
                    <p className="text-xs text-stone-500 mt-1">14l</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">12–20+ people</p>
                  </div>
                </div>
              </div>

              {/* Right — text */}
              <div>
                <p className="text-[11px] font-semibold tracking-[0.3em] uppercase text-gold-600">Bulk Delivery</p>
                <h2 className="mt-3 text-3xl font-bold text-stone-900 sm:text-4xl leading-[1.15] tracking-tight">
                  Catering for<br />any occasion.
                </h2>
                <p className="mt-4 text-sm text-stone-500 leading-relaxed">
                  Order traditional Nigerian food in bulk. Minimum order &pound;30.
                  Free delivery over &pound;100. 24-hour advance notice.
                </p>
                <div className="mt-6 flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-2 rounded-full bg-stone-900/40 px-7 py-3 text-sm font-semibold text-white/50 cursor-not-allowed">
                    Coming Soon
                  </span>
                  <a href="tel:02039046977" className="inline-flex items-center gap-2 rounded-full border-2 border-stone-300 px-6 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-100 transition-all">
                    Call to Order
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── EVENTS ─── */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        {/* Background image with warm overlay */}
        <div className="absolute inset-0">
          <Image
            src="/ss.jpg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a1a] via-black/70 to-[#1a1a1a]" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
          {/* Section header — bold and playful */}
          <div className="text-center mb-14">
            <p className="text-4xl sm:text-5xl mb-4">🎶🔥🍾</p>
            <p className="text-[11px] font-semibold tracking-[0.3em] uppercase text-gold-300">What&apos;s On</p>
            <h2 className="mt-3 text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              It&apos;s always a <span className="text-gold-300">vibe</span> at Demi&apos;s.
            </h2>
            <p className="mt-4 text-sm sm:text-base text-white/50 max-w-lg mx-auto">
              Live music, celebrations, and nights you won&apos;t forget.
            </p>
          </div>

          {/* Event cards — large, vibrant, with colour pops */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Afrobeats Night — hero card spanning full width on small */}
            <div className="sm:col-span-2 lg:col-span-1 group relative rounded-3xl overflow-hidden bg-gradient-to-br from-gold-300/20 via-[#2a2218]/80 to-[#1a1a1a] border border-gold-300/20 p-7 sm:p-9 transition-all duration-500 hover:border-gold-300/40 hover:shadow-[0_0_40px_rgba(232,204,156,0.12)]">
              <span className="text-4xl block mb-4">🎵</span>
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-gold-300">Every Friday</p>
              <h3 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                Live Afrobeats&nbsp;Night
              </h3>
              <p className="mt-3 text-sm text-white/60 leading-relaxed max-w-sm">
                With Deejay Why on the decks spinning Amapiano bangers, Afrobeats &amp; Afro-fusion. Cocktails, the best jollof in town, and a dance floor that&apos;s always packed.
              </p>
              <p className="mt-5 text-xs font-semibold text-gold-300">
                Cricklewood &middot; 8 PM &ndash; Late
              </p>
              <Link
                href="/booking"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold-300 px-6 py-2.5 text-xs font-bold text-[#1a1a1a] hover:bg-gold-200 transition-all"
              >
                Book a Table &rarr;
              </Link>
            </div>

            {/* Weekend Brunch */}
            <div className="group relative rounded-3xl overflow-hidden bg-gradient-to-br from-amber-600/10 via-[#222]/80 to-[#1a1a1a] border border-white/[0.08] p-7 sm:p-9 transition-all duration-500 hover:border-gold-300/30 hover:shadow-[0_0_30px_rgba(232,204,156,0.08)]">
              <span className="text-4xl block mb-4">🍳</span>
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-gold-300">Saturdays</p>
              <h3 className="mt-2 text-xl sm:text-2xl font-extrabold text-white leading-tight">
                Lunch Menu
              </h3>
              <p className="mt-3 text-sm text-white/60 leading-relaxed">
                Extensive lunch menu.
              </p>
              <p className="mt-5 text-xs font-semibold text-gold-300">
                Coming Soon
              </p>
            </div>

            {/* Suya Sundays */}
            <div className="group relative rounded-3xl overflow-hidden bg-gradient-to-br from-red-900/10 via-[#222]/80 to-[#1a1a1a] border border-white/[0.08] p-7 sm:p-9 transition-all duration-500 hover:border-gold-300/30 hover:shadow-[0_0_30px_rgba(232,204,156,0.08)]">
              <span className="text-4xl block mb-4">🔥</span>
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-gold-300">Every Sunday</p>
              <h3 className="mt-2 text-xl sm:text-2xl font-extrabold text-white leading-tight">
                Buffet Sundays
              </h3>
              <p className="mt-3 text-sm text-white/60 leading-relaxed">
                All-you-can-eat extensive buffet menu. Start the week with a feast!
              </p>
              <p className="mt-5 text-xs font-semibold text-gold-300">
                Cricklewood &middot; 4 PM &ndash; 10 PM
              </p>
            </div>
          </div>

          {/* Private Hire + CTA row */}
          <div className="mt-5 rounded-3xl border border-gold-300/15 bg-gradient-to-r from-gold-300/10 via-[#222]/60 to-gold-300/10 p-7 sm:p-9 flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
            <div className="flex-1 text-center sm:text-left">
              <span className="text-3xl">🎉</span>
              <h3 className="mt-2 text-xl sm:text-2xl font-extrabold text-white">
                Private Hire &amp; Celebrations
              </h3>
              <p className="mt-2 text-sm text-white/50">
                Birthdays, weddings, corporate events &mdash; make it a night to remember.
              </p>
            </div>
            <Link
              href="/contact"
              className="shrink-0 inline-flex items-center gap-2 rounded-full bg-gold-300 px-8 py-3.5 text-sm font-bold text-[#1a1a1a] hover:bg-gold-200 transition-all shadow-lg hover:shadow-gold-300/30"
            >
              Enquire Now &rarr;
            </Link>
          </div>

          {/* See all events link */}
          <div className="mt-10 text-center">
            <Link
              href="/events"
              className="inline-flex items-center gap-2 text-sm font-semibold text-gold-300 hover:text-gold-200 transition-colors"
            >
              See all events &amp; what&apos;s on &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10">
            <p className="section-label">Reviews</p>
            <h2 className="mt-3 heading-lg">Loved by our guests.</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 sm:gap-10 lg:gap-14">
            <div>
              <div className="flex items-center gap-0.5 mb-4 text-gold-300 text-sm">
                {[...Array(5)].map((_, i) => <span key={i}>&#9733;</span>)}
              </div>
              <p className="text-sm text-stone-400 leading-relaxed">
                &ldquo;I had the Demi’s Easter Menu and it was really nice. I really enjoyed the fish peppersoup, salad and the yamarita.&rdquo;
              </p>
              <p className="mt-5 text-sm font-semibold text-white">Edward</p>
              <p className="text-xs text-stone-500">Google Review</p>
            </div>

            <div>
              <div className="flex items-center gap-0.5 mb-4 text-gold-300 text-sm">
                {[...Array(5)].map((_, i) => <span key={i}>&#9733;</span>)}
              </div>
              <p className="text-sm text-stone-400 leading-relaxed">
                &ldquo;The restaurant was very nice and warm, they offered to take my jacket for me. One thing i love was Ada Service she as amazing and help Decided what I should have and she made a great recommendation I would recommend this restaurant for anyone looking to try good Nigeria food&rdquo;
              </p>
              <p className="mt-5 text-sm font-semibold text-white">Mariam Q.</p>
              <p className="text-xs text-stone-500">Google Review</p>
            </div>

            <div>
              <div className="flex items-center gap-0.5 mb-4 text-gold-300 text-sm">
                {[...Array(5)].map((_, i) => <span key={i}>&#9733;</span>)}
              </div>
              <p className="text-sm text-stone-400 leading-relaxed">
                &ldquo;The atmosphere feels consistent and thoughtfully arranged. The visit leaves a steady positive feeling.&rdquo;
              </p>
              <p className="mt-5 text-sm font-semibold text-white">Denise B.</p>
              <p className="text-xs text-stone-500">Google Review</p>
            </div>
          </div>
          <div className="mt-10 text-center">
            <a
              href="https://maps.app.goo.gl/Q8KryHAmAzV6wy3w5"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-gold-300/30 px-6 py-2.5 text-sm font-semibold text-gold-300 hover:bg-gold-300/10 transition-all"
            >
              Leave us a review <span>&rarr;</span>
            </a>
          </div>
        </div>
      </section>

      {/* ─── INSTAGRAM ─── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* Header */}
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 mb-5">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="20" height="20" rx="5" stroke="white" strokeWidth="1.5"/>
                <circle cx="12" cy="12" r="5" stroke="white" strokeWidth="1.5"/>
                <circle cx="17.5" cy="6.5" r="1.5" fill="white"/>
              </svg>
            </div>
            <p className="section-label">@demisrestaurant</p>
            <h2 className="mt-3 heading-lg">Catch the Vibe</h2>
            <p className="mt-4 text-sm sm:text-base text-stone-400 max-w-md mx-auto leading-relaxed">
              Follow us for the latest events, behind-the-scenes and mouth-watering dishes.
            </p>
          </div>

          {/* Reel Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {[
              { url: "https://www.instagram.com/reel/DXPgEe5jPji/", label: "Afrobeats night — energy, vibes & music all night long", thumb: "/reel-1.jpg" },
              { url: "https://www.instagram.com/reel/DXOygqKDM8D/", label: "Come spend your weekend with us", thumb: "/reel-2.jpg" },
              { url: "https://www.instagram.com/reel/DXHCsjMDEog/", label: "Still serving the best Nigerian food in London", thumb: "/reel-3.jpg" },
              { url: "https://www.instagram.com/reel/DXFF6f7jFEJ/", label: "The only place you need to be this Friday", thumb: "/reel-4.jpg" },
            ].map((reel, i) => (
              <a
                key={i}
                href={reel.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer"
              >
                <Image
                  src={reel.thumb}
                  alt={reel.label}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* Dark overlay on hover */}
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors duration-300" />

                {/* Play button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-white/20 bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 group-hover:border-white/30 group-hover:scale-110 transition-all duration-300">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white" className="ml-1">
                      <path d="M8 5.14v13.72a1 1 0 001.5.87l11.04-6.86a1 1 0 000-1.74L9.5 4.27a1 1 0 00-1.5.87z"/>
                    </svg>
                  </div>
                </div>

                {/* Bottom label */}
                <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5 bg-gradient-to-t from-black/50 to-transparent">
                  <div className="flex items-center gap-2 mb-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="2" width="20" height="20" rx="5" stroke="white" strokeWidth="1.5" opacity="0.7"/>
                      <circle cx="12" cy="12" r="5" stroke="white" strokeWidth="1.5" opacity="0.7"/>
                    </svg>
                    <span className="text-[10px] sm:text-xs text-white/60 font-medium tracking-wide uppercase">Reel</span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-white/90 leading-snug">{reel.label}</p>
                </div>

                {/* Top-right reel icon */}
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" opacity="0.4">
                    <rect x="2" y="4" width="20" height="16" rx="3"/>
                    <path d="M12 4V20M2 10h20"/>
                    <path d="M7 4l5 6M17 4l-5 6"/>
                  </svg>
                </div>
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-10 sm:mt-12 text-center">
            <a
              href="https://www.instagram.com/demisrestaurant/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 rounded-full border border-gold-300/30 px-7 py-3 text-sm font-semibold text-gold-300 hover:bg-gold-300/10 transition-all group"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-70 group-hover:opacity-100 transition-opacity">
                <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor"/>
              </svg>
              Follow @demisrestaurant <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
            </a>
          </div>
        </div>
      </section>

      {/* ─── RESERVATION CTA ─── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative rounded-2xl overflow-hidden bg-white py-16 sm:py-20 lg:py-24 px-6 text-center">
            <p className="text-[11px] font-semibold tracking-[0.3em] uppercase text-gold-600">Ready?</p>
            <h2 className="mt-3 text-3xl sm:text-5xl font-bold text-stone-900 tracking-tight">Your table is waiting.</h2>
            <p className="mt-5 text-sm sm:text-base text-stone-500 max-w-lg mx-auto leading-relaxed">
              89 Cricklewood Broadway, London NW2 3JG.
              Open daily from 12:00 PM. Walk-ins welcome.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
              <Link
                href="/booking"
                className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-7 py-3 text-sm font-semibold text-white hover:bg-stone-800 transition-all"
              >
                Reserve a Table
              </Link>
              <a href="tel:02039046977" className="inline-flex items-center gap-2 rounded-full border-2 border-stone-300 px-7 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-100 transition-all">
                Call 020 3904 6977
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
