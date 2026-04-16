import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Menu | Nigerian Food in Cricklewood, London",
  description:
    "Explore our authentic Nigerian menu — jollof rice, egusi soup, suya, pounded yam, fried rice, pepper soup, asun, and more. Dine in at 89 Cricklewood Broadway, NW2 3JG or order bulk delivery across London.",
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
    title: "Menu | Demi's Restaurant — Authentic Nigerian Cuisine",
    description: "Browse our full Nigerian menu. From jollof rice to suya, egusi soup to pounded yam. Dine in or order bulk delivery.",
  },
  alternates: {
    canonical: "https://demisrestaurant.co.uk/menu",
  },
};

const menuCategories = [
  {
    name: "Rice Dishes",
    items: [
      { name: "Jollof Rice", description: "Smoky one-pot rice in rich tomato and pepper sauce. Nigeria's most beloved dish." },
      { name: "Fried Rice", description: "Nigerian-style fried rice with mixed vegetables, prawns, and liver. A colourful party favourite." },
      { name: "Coconut Rice", description: "Fragrant rice cooked in creamy coconut milk with a hint of sweetness." },
      { name: "White Rice & Stew", description: "Fluffy white rice served with our signature tomato-pepper stew." },
    ],
  },
  {
    name: "Soups & Stews",
    items: [
      { name: "Egusi Soup", description: "Thick melon seed soup with spinach, stockfish, and assorted meats." },
      { name: "Pepper Soup", description: "Fiery aromatic broth with catfish or goat meat and traditional spices." },
      { name: "Ogbono Soup", description: "Rich, draw soup made from ground ogbono seeds with leafy vegetables." },
      { name: "Efo Riro", description: "Yoruba-style spicy spinach stew with assorted meats and dried fish." },
      { name: "Banga Soup", description: "Palm fruit soup from the Niger Delta, rich and deeply flavourful." },
    ],
  },
  {
    name: "Swallows",
    items: [
      { name: "Pounded Yam", description: "Smooth, stretchy pounded yam. The perfect companion to any Nigerian soup." },
      { name: "Eba (Garri)", description: "Cassava-based swallow with a slightly sour taste. A staple across Nigeria." },
      { name: "Amala", description: "Dark, smooth yam flour swallow popular in Yoruba cuisine." },
      { name: "Semovita", description: "Light, fluffy semolina-based swallow. Mild flavour pairs with any soup." },
    ],
  },
  {
    name: "Grills & Proteins",
    items: [
      { name: "Suya", description: "Spicy grilled beef skewers in ground peanut and suya spice blend." },
      { name: "Asun", description: "Smoky spiced goat meat, slow-roasted and tossed in peppers." },
      { name: "Peppered Chicken", description: "Grilled chicken in a spicy pepper sauce. Bold and flavourful." },
      { name: "Grilled Fish", description: "Whole tilapia or croaker, seasoned and grilled to perfection." },
      { name: "Peppered Snail", description: "Tender snails cooked in a rich, spicy pepper sauce." },
    ],
  },
  {
    name: "Sides & Small Chops",
    items: [
      { name: "Plantain (Fried/Grilled)", description: "Sweet, ripe plantain fried golden or grilled with a smoky char." },
      { name: "Moi Moi", description: "Steamed bean pudding with eggs and fish. A protein-rich Nigerian classic." },
      { name: "Puff Puff", description: "Sweet fried dough balls. Light, fluffy, and irresistible." },
      { name: "Chin Chin", description: "Crunchy fried pastry snack. Perfect for any occasion." },
      { name: "Coleslaw &amp; Salad", description: "Fresh, creamy coleslaw or garden salad to complement your meal." },
    ],
  },
  {
    name: "Drinks",
    items: [
      { name: "Chapman", description: "Nigeria's signature non-alcoholic cocktail with Fanta, Sprite, grenadine, and bitters." },
      { name: "Zobo", description: "Chilled hibiscus drink with ginger and pineapple. Refreshing and naturally sweet." },
      { name: "Palm Wine", description: "Traditional fermented palm sap. Mildly sweet with a slight fizz." },
      { name: "Soft Drinks &amp; Water", description: "Selection of soft drinks, juices, and still/sparkling water." },
    ],
  },
];

// SERVER COMPONENT — all menu content is server-rendered for SEO
export default function MenuPage() {
  return (
    <div className="">
      {/* Header */}
      <section className="px-6 pt-16 pb-10 sm:pt-24 sm:pb-14">
        <div className="mx-auto max-w-3xl text-center">
          <p className="section-label">Our Menu</p>
          <h1 className="mt-4 heading-display">
            Authentic Nigerian flavours, fresh daily.
          </h1>
          <p className="mt-4 body-text max-w-xl mx-auto">
            Everything is prepared fresh using authentic Nigerian recipes.
            Dine in at 89 Cricklewood Broadway, NW2 3JG, or order bulk delivery across London.
          </p>
        </div>
      </section>

      {/* Menu categories */}
      {menuCategories.map((category) => (
        <section key={category.name} className="py-10 sm:py-14">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="text-lg font-semibold text-white tracking-tight mb-6 pb-3 border-b border-white/10">
              {category.name}
            </h2>
            <div className="space-y-0 divide-y divide-white/10">
              {category.items.map((item) => (
                <article key={item.name} className="py-4">
                  <h3 className="font-medium text-white">{item.name}</h3>
                  <p className="mt-1 text-sm text-stone-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: item.description }} />
                </article>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="heading-lg">Ready to order?</h2>
          <p className="mt-3 body-text">
            Dine in, book a table, or order in bulk for delivery across London.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
            <a href="/booking" className="btn-gold text-xs">
              Book a Table
            </a>
            <Link href="/bulk-orders" className="btn-outline-white text-xs">
              Bulk Order
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
