import Link from "next/link";

// SERVER COMPONENT — fully rendered HTML for maximum SEO
export default function HomePage() {
  return (
    <>
      {/* ─── TOP ANNOUNCEMENT BAR (mobile only — desktop has the top nav) ─── */}
      <div className="bg-white lg:hidden">
        <div className="py-3 sm:py-3.5 text-center">
          <p className="text-[11px] sm:text-xs font-semibold tracking-[0.3em] uppercase text-stone-900">
            Dine With Us!
          </p>
        </div>
      </div>

      {/* ─── VIDEO HERO ─── */}
      <section className="relative h-[100svh] overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-black/55" />

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
          <h1 className="text-white">
            <span className="block text-[clamp(2.8rem,10vw,5.5rem)] font-bold uppercase tracking-[0.04em] leading-[1]">
              DEMI{/* Chili pepper apostrophe — small, top-positioned */}<span className="inline-block relative -top-[0.38em] -mx-[0.01em]"><svg viewBox="0 0 24 44" className="h-[0.28em] w-auto inline-block" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 1C12 1,13 5,12 8" stroke="#2d7a2d" strokeWidth="2" strokeLinecap="round" fill="none"/><path d="M12 5C14 3,17 3.5,16 6C15 7.5,13 6.5,12 5Z" fill="#2d7a2d"/><path d="M7 10C4 12,3 20,5 28C6 32,8 37,10 41C11 43,13 43,13 41C15 35,19 26,19 20C19 14,16 9,12 9C10 9,8 9.5,7 10Z" fill="#d42c2c"/><path d="M9 14C8 17,7 23,8 29" stroke="#e85050" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5"/></svg></span>S
            </span>
            <span className="block text-[clamp(0.65rem,1.6vw,0.8rem)] tracking-[0.45em] uppercase font-light mt-3 text-gold-300">
              Nigerian Restaurant
            </span>
          </h1>

          <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
            <a
              href="/booking"
              className="btn-gold"
            >
              Reserve a Table
            </a>
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
                <a
                  href="https://dropoff.demisrestaurant.co.uk/menu"
                  className="mt-7 inline-flex items-center gap-2 rounded-full bg-gold-300 px-6 py-2.5 text-sm font-semibold text-stone-900 hover:bg-gold-200 transition-all"
                >
                  Start your order <span>&rarr;</span>
                </a>
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
                <a
                  href="/booking"
                  className="mt-7 inline-flex items-center gap-2 rounded-full bg-gold-300 px-6 py-2.5 text-sm font-semibold text-stone-900 hover:bg-gold-200 transition-all"
                >
                  Reserve a table <span>&rarr;</span>
                </a>
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
            {/* Cricklewood */}
            <div className="relative rounded-2xl overflow-hidden h-[340px] sm:h-[380px]">
              <video
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              >
                <source src="/hero.mp4" type="video/mp4" />
              </video>
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
              <img
                src="/streatham.jpeg"
                alt="Demi's Restaurant Streatham Hill"
                className="absolute inset-0 w-full h-full object-cover"
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
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-4xl sm:text-5xl font-bold text-stone-900">4L</p>
                    <p className="text-xs text-stone-500 mt-1">Small</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">3–5 people</p>
                  </div>
                  <div>
                    <p className="text-4xl sm:text-5xl font-bold text-gold-600">7L</p>
                    <p className="text-xs text-stone-500 mt-1">Medium</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">6–10 people</p>
                  </div>
                  <div>
                    <p className="text-4xl sm:text-5xl font-bold text-stone-900">14L</p>
                    <p className="text-xs text-stone-500 mt-1">Large</p>
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
                  <a href="https://dropoff.demisrestaurant.co.uk/menu" className="btn-dark">
                    Order Now
                  </a>
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
          <img src="/events.jpeg" alt="" className="w-full h-full object-cover" />
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
                Both Locations &middot; 8 PM &ndash; Late
              </p>
              <a
                href="/booking"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold-300 px-6 py-2.5 text-xs font-bold text-[#1a1a1a] hover:bg-gold-200 transition-all"
              >
                Book a Table &rarr;
              </a>
            </div>

            {/* Weekend Brunch */}
            <div className="group relative rounded-3xl overflow-hidden bg-gradient-to-br from-amber-600/10 via-[#222]/80 to-[#1a1a1a] border border-white/[0.08] p-7 sm:p-9 transition-all duration-500 hover:border-gold-300/30 hover:shadow-[0_0_30px_rgba(232,204,156,0.08)]">
              <span className="text-4xl block mb-4">🍳</span>
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-gold-300">Saturdays &amp; Sundays</p>
              <h3 className="mt-2 text-xl sm:text-2xl font-extrabold text-white leading-tight">
                Weekend Brunch
              </h3>
              <p className="mt-3 text-sm text-white/60 leading-relaxed">
                Akara, plantain, eggs &amp; bottomless Chapman cocktails. Bring the whole crew.
              </p>
              <p className="mt-5 text-xs font-semibold text-gold-300">
                Both Locations &middot; 11 AM &ndash; 3 PM
              </p>
            </div>

            {/* Suya Sundays */}
            <div className="group relative rounded-3xl overflow-hidden bg-gradient-to-br from-red-900/10 via-[#222]/80 to-[#1a1a1a] border border-white/[0.08] p-7 sm:p-9 transition-all duration-500 hover:border-gold-300/30 hover:shadow-[0_0_30px_rgba(232,204,156,0.08)]">
              <span className="text-4xl block mb-4">🔥</span>
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-gold-300">Every Sunday</p>
              <h3 className="mt-2 text-xl sm:text-2xl font-extrabold text-white leading-tight">
                Suya Sundays
              </h3>
              <p className="mt-3 text-sm text-white/60 leading-relaxed">
                Char-grilled, perfectly spiced suya platters. Cold drinks. Good vibes only.
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
                &ldquo;The jollof rice here is incredible. Smoky, perfectly spiced, and tastes exactly
                like what you&apos;d get in Lagos. Best Nigerian food in North London.&rdquo;
              </p>
              <p className="mt-5 text-sm font-semibold text-white">Tunde A.</p>
              <p className="text-xs text-stone-500">Google Review</p>
            </div>

            <div>
              <div className="flex items-center gap-0.5 mb-4 text-gold-300 text-sm">
                {[...Array(5)].map((_, i) => <span key={i}>&#9733;</span>)}
              </div>
              <p className="text-sm text-stone-400 leading-relaxed">
                &ldquo;We ordered bulk for my daughter&apos;s birthday &mdash; 14L of jollof.
                Arrived fresh and on time. Every guest was asking where we got the food!&rdquo;
              </p>
              <p className="mt-5 text-sm font-semibold text-white">Ngozi M.</p>
              <p className="text-xs text-stone-500">Google Review</p>
            </div>

            <div>
              <div className="flex items-center gap-0.5 mb-4 text-gold-300 text-sm">
                {[...Array(5)].map((_, i) => <span key={i}>&#9733;</span>)}
              </div>
              <p className="text-sm text-stone-400 leading-relaxed">
                &ldquo;Warm atmosphere, amazing suya, and the staff are so welcoming.
                This is our go-to spot whenever we&apos;re in Cricklewood. Highly recommend.&rdquo;
              </p>
              <p className="mt-5 text-sm font-semibold text-white">David O.</p>
              <p className="text-xs text-stone-500">Google Review</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── INSTAGRAM REELS ─── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="section-label">Follow Us</p>
              <h2 className="mt-3 heading-lg">Latest from Instagram.</h2>
            </div>
            <a
              href="https://www.instagram.com/demisrestaurant/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-gold-300 hover:text-gold-200 transition-colors"
            >
              @demisrestaurant <span>&rarr;</span>
            </a>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <a
              href="https://www.instagram.com/reel/DIfnx2dI7rq/"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-[9/16] rounded-xl overflow-hidden bg-[#222]"
            >
              <iframe
                src="https://www.instagram.com/reel/DIfnx2dI7rq/embed/"
                className="absolute inset-0 w-full h-full pointer-events-none"
                loading="lazy"
                title="Demi's Instagram Reel 1"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </a>
            <a
              href="https://www.instagram.com/reel/DITLcOqoGPt/"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-[9/16] rounded-xl overflow-hidden bg-[#222]"
            >
              <iframe
                src="https://www.instagram.com/reel/DITLcOqoGPt/embed/"
                className="absolute inset-0 w-full h-full pointer-events-none"
                loading="lazy"
                title="Demi's Instagram Reel 2"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </a>
            <a
              href="https://www.instagram.com/reel/DIGHCMzIRy7/"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-[9/16] rounded-xl overflow-hidden bg-[#222]"
            >
              <iframe
                src="https://www.instagram.com/reel/DIGHCMzIRy7/embed/"
                className="absolute inset-0 w-full h-full pointer-events-none"
                loading="lazy"
                title="Demi's Instagram Reel 3"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </a>
            <a
              href="https://www.instagram.com/reel/DH4U3mKoGqm/"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-[9/16] rounded-xl overflow-hidden bg-[#222]"
            >
              <iframe
                src="https://www.instagram.com/reel/DH4U3mKoGqm/embed/"
                className="absolute inset-0 w-full h-full pointer-events-none"
                loading="lazy"
                title="Demi's Instagram Reel 4"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </a>
          </div>

          <div className="mt-6 text-center sm:hidden">
            <a
              href="https://www.instagram.com/demisrestaurant/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-gold-300 hover:text-gold-200 transition-colors"
            >
              @demisrestaurant <span>&rarr;</span>
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
              <a
                href="/booking"
                className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-7 py-3 text-sm font-semibold text-white hover:bg-stone-800 transition-all"
              >
                Reserve a Table
              </a>
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
