import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us | Our Story",
  description:
    "Learn about Demi's Restaurant — a proudly Nigerian restaurant at 89 Cricklewood Broadway, London NW2 3JG. Our story, our passion for Nigerian cuisine, and our commitment to quality.",
  openGraph: {
    title: "About Demi's Restaurant — Nigerian Cuisine in London",
    description: "Our story, our passion for Nigerian food, and our commitment to bringing real West African flavours to London.",
  },
  alternates: {
    canonical: "https://demisrestaurant.co.uk/about",
  },
};

export default function AboutPage() {
  return (
    <div className="">
      {/* Hero */}
      <section className="px-6 pt-16 pb-10 sm:pt-24 sm:pb-14">
        <div className="mx-auto max-w-3xl lg:max-w-4xl text-center">
          <p className="section-label">About Us</p>
          <h1 className="mt-4 heading-display">
            Bringing the flavours of Nigeria to London.
          </h1>
          <p className="mt-6 body-text max-w-xl mx-auto lg:max-w-2xl text-base sm:text-lg leading-relaxed">
            At Demi&apos;s Restaurant, we believe food is more than sustenance &mdash; it&apos;s a connection to home,
            a celebration of culture, and an act of love.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-3xl lg:max-w-4xl px-6">
          <h2 className="heading-lg text-center">Our Story</h2>
          <div className="mt-8 space-y-5 body-text leading-relaxed lg:text-base lg:columns-2 lg:gap-10 lg:space-y-0 [&>p]:lg:mb-5">
            <p>
              Demi&apos;s Restaurant was born from a deep love for Nigerian food and a desire to share it with London.
              Located at 89 Cricklewood Broadway in the heart of NW2, we&apos;ve become a destination for anyone craving
              true West African flavours.
            </p>
            <p>
              Our kitchen is led by experienced Nigerian chefs who bring generations of culinary knowledge to every dish.
              From the smoky depth of our jollof rice to the fiery kick of our suya, every recipe is rooted in tradition
              and perfected with care.
            </p>
            <p>
              Whether you&apos;re joining us for a relaxed dinner, ordering bulk meals for an event, or simply picking up
              takeaway on the way home, you&apos;ll always find a warm welcome and exceptional food at Demi&apos;s.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 sm:py-24 border-t border-white/10">
        <div className="mx-auto max-w-3xl lg:max-w-5xl px-6">
          <h2 className="heading-lg text-center">What makes us special</h2>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
            <div className="text-center">
              <h3 className="font-semibold text-white">Authenticity</h3>
              <p className="mt-2 text-sm text-stone-400">Real Nigerian recipes, real ingredients, real flavour. No shortcuts.</p>
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-white">Freshness</h3>
              <p className="mt-2 text-sm text-stone-400">Every dish is made fresh daily. We never serve frozen or reheated food.</p>
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-white">Hospitality</h3>
              <p className="mt-2 text-sm text-stone-400">Warm, welcoming service rooted in Nigerian culture and generosity.</p>
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-white">Community</h3>
              <p className="mt-2 text-sm text-stone-400">A gathering place for friends, family, and food lovers across London.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Visit */}
      <section className="py-16 sm:py-24 border-t border-white/10">
        <div className="mx-auto max-w-3xl lg:max-w-4xl px-6 text-center">
          <h2 className="heading-lg">Visit Us</h2>
          <div className="mt-6 space-y-2 text-sm text-stone-400">
            <address className="not-italic">89 Cricklewood Broadway, London NW2 3JG</address>
            <p>Monday &ndash; Sunday: 12:00 PM &ndash; Late</p>
            <p><a href="tel:02039046977" className="hover:text-white transition-colors">020 3904 6977</a></p>
            <p><a href="mailto:bookings@demisrestaurant.co.uk" className="hover:text-white transition-colors">bookings@demisrestaurant.co.uk</a></p>
          </div>

          {/* Map */}
          <div className="mt-10 rounded-xl overflow-hidden h-72 sm:h-80 lg:h-[420px] border border-white/10">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2481.2!2d-0.2136!3d51.555!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2s89+Cricklewood+Broadway+London+NW2+3JG!5e0!3m2!1sen!2suk!4v1"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Demi's Restaurant location — 89 Cricklewood Broadway, London NW2 3JG"
            />
          </div>

          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <a href="/booking" className="btn-gold text-xs">
              Reserve a Table
            </a>
            <Link href="/contact" className="btn-outline-white text-xs">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
