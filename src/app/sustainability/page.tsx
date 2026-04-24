import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sustainability | Our Commitment",
  description:
    "Learn about Demi's Restaurant's commitment to sustainability — locally sourced ingredients, reduced food waste, eco-friendly packaging, and supporting our community in Cricklewood and beyond.",
  openGraph: {
    title: "Sustainability at Demi's Restaurant",
    description: "Our commitment to sustainable practices, from sourcing to packaging.",
  },
  alternates: {
    canonical: "https://www.demisrestaurant.co.uk/sustainability",
  },
};

export default function SustainabilityPage() {
  return (
    <div className="">
      {/* Hero */}
      <section className="px-6 pt-16 pb-10 sm:pt-24 sm:pb-14">
        <div className="mx-auto max-w-3xl text-center">
          <p className="section-label">Sustainability</p>
          <h1 className="mt-4 heading-display">
            Good food, better choices.
          </h1>
          <p className="mt-6 body-text max-w-xl mx-auto text-base sm:text-lg leading-relaxed">
            At Demi&apos;s, we believe great food should respect the planet. We&apos;re committed to
            making choices that are better for our community and the environment.
          </p>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-16 sm:py-24 border-t border-white/10">
        <div className="mx-auto max-w-3xl px-6 space-y-16">
          <div className="text-center">
            <h2 className="font-semibold text-white text-lg">Locally Sourced Ingredients</h2>
            <p className="mt-3 text-sm text-stone-400 max-w-lg mx-auto leading-relaxed">
              Wherever possible, we source our fresh produce from local suppliers and markets
              in and around London, reducing food miles and supporting local businesses.
            </p>
          </div>

          <div className="text-center">
            <h2 className="font-semibold text-white text-lg">Reducing Food Waste</h2>
            <p className="mt-3 text-sm text-stone-400 max-w-lg mx-auto leading-relaxed">
              Our bulk ordering system and fresh-daily cooking method means we prepare exactly
              what&apos;s needed. This minimises waste and ensures every dish reaches you at
              its best.
            </p>
          </div>

          <div className="text-center">
            <h2 className="font-semibold text-white text-lg">Eco-Friendly Packaging</h2>
            <p className="mt-3 text-sm text-stone-400 max-w-lg mx-auto leading-relaxed">
              We&apos;re moving towards fully recyclable and compostable packaging for our
              delivery and takeaway orders. Small steps that make a meaningful difference.
            </p>
          </div>

          <div className="text-center">
            <h2 className="font-semibold text-white text-lg">Community First</h2>
            <p className="mt-3 text-sm text-stone-400 max-w-lg mx-auto leading-relaxed">
              We&apos;re proud to be part of the Cricklewood community. From hiring locally to
              supporting neighbourhood events, Demi&apos;s is more than a restaurant &mdash;
              it&apos;s a gathering place.
            </p>
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="py-16 sm:py-24 border-t border-white/10">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <blockquote className="text-lg sm:text-xl font-light text-stone-400 leading-relaxed italic">
            &ldquo;We cook with love and serve with purpose. Every small choice adds up
            to a better future for our community and our planet.&rdquo;
          </blockquote>
          <p className="mt-4 text-xs text-stone-400 tracking-[0.2em] uppercase">Demi&apos;s Kitchen</p>
        </div>
      </section>
    </div>
  );
}
