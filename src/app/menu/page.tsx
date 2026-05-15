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
    <>
      {/* ─── Hero ─── */}
      <section className="relative h-[60vh] sm:h-[70vh] overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/set-hero.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
          <p className="section-label">Demi&apos;s Restaurant</p>
          <h1 className="mt-3 text-4xl sm:text-6xl font-bold text-white tracking-tight">
            Our Menu
          </h1>
          <p className="mt-4 text-sm sm:text-base text-white/60 max-w-md">
            Traditional Nigerian recipes prepared fresh daily. Dine in or order bulk delivery across London.
          </p>
        </div>
      </section>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs text-stone-500 py-4 border-b border-white/[0.06]">
        <span><span className="text-emerald-400 font-bold">V</span> = Vegetarian</span>
        <span>🌶 = Spicy</span>
        <span className="text-gold-300/70">All prices in £</span>
      </div>

      {/* Interactive menu with search */}
      <MenuContent />
    </>
  );
}
