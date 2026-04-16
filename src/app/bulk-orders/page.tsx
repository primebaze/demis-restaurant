import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bulk Food Delivery | Nigerian Catering London",
  description:
    "Order authentic Nigerian food in bulk for delivery across London. Jollof rice, egusi soup, suya, and more in 4L, 7L, and 14L portions. Perfect for parties, offices, and events. 24-hour advance ordering from Demi's Restaurant.",
  keywords: [
    "bulk Nigerian food delivery London",
    "Nigerian catering London",
    "party food delivery",
    "bulk jollof rice order",
    "African food catering",
    "office catering Nigerian food",
    "event catering London NW2",
    "bulk food order Cricklewood",
  ],
  openGraph: {
    title: "Bulk Nigerian Food Delivery Across London | Demi's Restaurant",
    description: "Order authentic Nigerian meals in bulk — jollof rice, egusi soup, suya, and more. Delivered fresh across London.",
  },
  alternates: {
    canonical: "https://demisrestaurant.co.uk/bulk-orders",
  },
};

export default function BulkOrdersPage() {
  return (
    <div className="">
      {/* Hero */}
      <section className="px-6 pt-16 pb-10 sm:pt-24 sm:pb-14">
        <div className="mx-auto max-w-3xl text-center">
          <p className="section-label">Bulk Delivery</p>
          <h1 className="mt-4 heading-display">
            Nigerian food, delivered in bulk.
          </h1>
          <p className="mt-6 body-text max-w-xl mx-auto text-base sm:text-lg leading-relaxed">
            Feeding a crowd? Order authentic Nigerian meals in bulk from Demi&apos;s.
            Perfect for offices, parties, family gatherings, and events.
            Delivered fresh across London with just 24 hours&apos; notice.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
            <a href="https://dropoff.demisrestaurant.co.uk/menu" className="btn-gold text-xs">
              Order Now
            </a>
            <a href="tel:02039046977" className="btn-outline-white text-xs">
              Call to Order
            </a>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-24 border-t border-white/10">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="heading-lg text-center">How It Works</h2>
          <div className="mt-12 grid sm:grid-cols-2 gap-10">
            <div className="text-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-sm font-semibold text-white mx-auto mb-3">1</div>
              <h3 className="font-semibold text-white">Browse &amp; build</h3>
              <p className="mt-2 text-sm text-stone-400">Choose your dishes and pick a portion size from our full menu.</p>
            </div>
            <div className="text-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-sm font-semibold text-white mx-auto mb-3">2</div>
              <h3 className="font-semibold text-white">Place order 24hrs prior</h3>
              <p className="mt-2 text-sm text-stone-400">Orders must be placed at least 24 hours in advance.</p>
            </div>
            <div className="text-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-sm font-semibold text-white mx-auto mb-3">3</div>
              <h3 className="font-semibold text-white">We cook fresh</h3>
              <p className="mt-2 text-sm text-stone-400">Every order prepared fresh on the morning of delivery. Never frozen.</p>
            </div>
            <div className="text-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-sm font-semibold text-white mx-auto mb-3">4</div>
              <h3 className="font-semibold text-white">Delivered to your door</h3>
              <p className="mt-2 text-sm text-stone-400">Straight to your office, venue, or home across London &mdash; on time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Portion Sizes */}
      <section className="py-16 sm:py-24 border-t border-white/10">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="heading-lg">Portion Sizes</h2>
          <div className="mt-12 grid sm:grid-cols-3 gap-6">
            <div className="rounded-xl border border-white/10 p-6">
              <h3 className="text-2xl font-bold text-white">4L</h3>
              <p className="text-xs text-stone-400 mt-1 tracking-wider uppercase">Small</p>
              <p className="mt-3 text-sm text-stone-400">Perfect for 3&ndash;5 people. Family dinners and small get-togethers.</p>
            </div>
            <div className="rounded-xl border-2 border-gold-300 p-6 relative">
              <span className="absolute top-3 right-3 text-[10px] font-semibold text-white border border-white/20 rounded-full px-2 py-0.5">Popular</span>
              <h3 className="text-2xl font-bold text-white">7L</h3>
              <p className="text-xs text-stone-400 mt-1 tracking-wider uppercase">Medium</p>
              <p className="mt-3 text-sm text-stone-400">Ideal for 6&ndash;10 people. Office lunches and parties.</p>
            </div>
            <div className="rounded-xl border border-white/10 p-6">
              <h3 className="text-2xl font-bold text-white">14L</h3>
              <p className="text-xs text-stone-400 mt-1 tracking-wider uppercase">Large</p>
              <p className="mt-3 text-sm text-stone-400">Feeds 12&ndash;20+ people. Large events, weddings, and celebrations.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Info */}
      <section className="py-16 sm:py-24 border-t border-white/10">
        <div className="mx-auto max-w-3xl px-6">
          <div className="grid sm:grid-cols-2 gap-8">
            <div className="text-center">
              <h3 className="font-semibold text-white">24-Hour Notice</h3>
              <p className="mt-2 text-sm text-stone-400">All orders must be placed at least 24 hours before delivery.</p>
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-white">London-Wide Delivery</h3>
              <p className="mt-2 text-sm text-stone-400">Delivery fee varies by distance from our Cricklewood kitchen.</p>
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-white">&pound;30 Minimum Order</h3>
              <p className="mt-2 text-sm text-stone-400">Free delivery on orders over &pound;100.</p>
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-white">Delivered Fresh</h3>
              <p className="mt-2 text-sm text-stone-400">From 1:00 PM daily. Every meal prepared fresh on delivery day.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="heading-lg">Ready to place your order?</h2>
          <p className="mt-3 body-text">Order online or call us to arrange bulk delivery across London.</p>
          <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
            <a href="https://dropoff.demisrestaurant.co.uk/menu" className="btn-gold text-xs">
              Order Online
            </a>
            <a href="tel:02039046977" className="btn-outline-white text-xs">
              Call 020 3904 6977
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
