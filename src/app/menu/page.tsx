import type { Metadata } from "next";
import MenuContent from "@/components/MenuContent";

export const metadata: Metadata = {
  title: "Menu | Nigerian Food in Cricklewood, London",
  description:
    "Explore our full Nigerian menu — jollof rice, egusi soup, suya, pounded yam, fried rice, pepper soup, asun, and more. Dine in at 89 Cricklewood Broadway, NW2 3JG or order bulk delivery across London.",
  keywords: [
    "Nigerian food menu",
    "jollof rice Cricklewood",
    "egusi soup London",
    "suya near me",
    "pounded yam London",
    "African food menu NW2",
    "Nigerian restaurant menu",
  ],
  openGraph: {
    title: "Menu | Demi's Restaurant — Traditional Nigerian Cuisine",
    description:
      "Browse our full Nigerian menu. From jollof rice to suya, egusi soup to pounded yam. Dine in or order bulk delivery.",
  },
  alternates: {
    canonical: "https://www.demisrestaurant.co.uk/menu",
  },
};

export default function MenuPage() {
  return (
    <div className="">
      {/* ─── Hero ─── */}
      <section className="px-6 pt-16 pb-6 sm:pt-24 sm:pb-10">
        <div className="mx-auto max-w-7xl text-center">
          <p className="section-label">Our Menu</p>
          <h1 className="mt-4 heading-display">
            Explore Our Delicious Nigerian Dishes
          </h1>
          <p className="mt-4 body-text max-w-xl mx-auto lg:max-w-2xl">
            Everything is prepared fresh using traditional Nigerian recipes.
            Dine in at 89 Cricklewood Broadway, NW2 3JG, or order bulk delivery across London.
          </p>
          {/* Legend */}
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-stone-500">
            <span><span className="text-emerald-400 font-bold">V</span> = Vegetarian</span>
            <span>🌶 = Spicy</span>
            <span className="text-gold-300/70">All prices in £</span>
          </div>
        </div>
      </section>

      {/* Interactive menu with search */}
      <MenuContent />
    </div>
  );
}
