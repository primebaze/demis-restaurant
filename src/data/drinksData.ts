/* Drinks list. Lives here rather than in the drinks page so the door
   check-in order picker can use the same list. */

/* ─── Types ─── */
export type DrinkItem = { name: string; price?: string; abv?: string; desc?: string };
export type DrinkSection = {
  id: string;
  label: string;
  icon: string;
  accent: string;
  note?: string;
  items?: DrinkItem[];
  subsections?: { title: string; note?: string; items: DrinkItem[] }[];
};

/* ─── Data ─── */
export const SECTIONS: DrinkSection[] = [
  {
    id: "cocktails",
    label: "Cocktails",
    icon: "🍹",
    accent: "from-teal-500/20 to-cyan-500/10",
    note: "£15 each",
    items: [
      { name: "Chapman", desc: "Cucumber, lime, lemon, orange and blackcurrant" },
      { name: "Classic Mojito", desc: "Muddled fresh lime and mint topped with lemonade" },
      { name: "Piña Colada", desc: "Chilled glass of coconut cream and pineapple juice" },
      { name: "Blue Lemonade", desc: "Blue Curaçao, lemon, lemonade" },
      { name: "Ginger Cooler", desc: "Fresh mint, lime juice and ginger" },
      { name: "Apple Mojito", desc: "Apple, lime juice, mint" },
      { name: "Strawberry", desc: "Strawberry, lime, lemonade, mint" },
    ],
  },
  {
    id: "mocktails",
    label: "Mocktails",
    icon: "🥤",
    accent: "from-lime-500/20 to-green-500/10",
    note: "£10 each",
    items: [
      { name: "Chapman", desc: "Cucumber, lime, lemon, orange and blackcurrant" },
      { name: "Classic Mojito", desc: "Muddled fresh lime and mint topped with lemonade" },
      { name: "Piña Colada", desc: "Chilled glass of coconut cream and pineapple juice" },
      { name: "Blue Lemonade", desc: "Blue Curaçao, lemon, lemonade" },
      { name: "Ginger Cooler", desc: "Fresh mint, lime juice and ginger" },
      { name: "Apple Mojito", desc: "Apple, lime juice, mint" },
      { name: "Strawberry", desc: "Strawberry, lime, lemonade, mint" },
    ],
  },
  {
    id: "ginger-gordons",
    label: "Gin-ger",
    icon: "🫙",
    accent: "from-pink-500/20 to-rose-500/10",
    note: "Gordon's Gin — Lagos meets London",
    items: [
      {
        name: "Pinkish",
        desc: "Premium pink Gordon's poured over ice with crushed strawberry and chaps extracts",
      },
      {
        name: "Ballers",
        desc: "Tropical passion fruit Gordon's poured over ice with ginger and lemon garnish",
      },
    ],
  },
  {
    id: "beer",
    label: "Beer & Cider",
    icon: "🍺",
    accent: "from-amber-500/20 to-yellow-500/10",
    subsections: [
      {
        title: "Bottles — £12",
        items: [
          { name: "Trophy", abv: "5%", desc: "Malted barley, hops, maize grits & water" },
          { name: "Star", abv: "5.1%", desc: "Cold filtered with a crisp, refreshing taste" },
          { name: "Big Guinness", abv: "7.5%", desc: "More hops for a bold, intense and rich flavour" },
          { name: "Origin", abv: "5.5%", desc: "Spirit mixed drink with African herbs and fruit extracts" },
          { name: "Heineken", abv: "5%", desc: "Brewed with water, malted barley and hops" },
          { name: "Guilder", abv: "5.2%", desc: "Golden beer slow brewed with rich malted barley and aromatic hops" },
          { name: "Stella Artois", abv: "4.6%", desc: "Brewed with water, barley malt, maize and hops" },
        ],
      },
      {
        title: "Cider — £12",
        items: [
          { name: "Kopparberg Mixed Fruits", abv: "4%", desc: "Apple cider infused with raspberry & blackcurrant" },
        ],
      },
      {
        title: "Small Bottles",
        items: [
          { name: "Small Guinness", abv: "7.5%", price: "£10" },
          { name: "Smirnoff Ice", abv: "4%", price: "£10" },
          { name: "Prosecco", abv: "10.5%", price: "£10" },
        ],
      },
    ],
  },
  {
    id: "wines",
    label: "Wines",
    icon: "🍷",
    accent: "from-purple-500/20 to-pink-500/10",
    subsections: [
      {
        title: "White Wine",
        note: "Bottle £30",
        items: [
          { name: "Languore Trebbiano Chardonnay Rubicone" },
          { name: "Gufetto Pinot Grigio" },
          { name: "Mozzafiato Falanghina" },
          { name: "Valle Berta Gavi" },
        ],
      },
      {
        title: "Red Wine",
        note: "Bottle £30",
        items: [
          { name: "Crescendo Merlot" },
          { name: "Languore Sangiovese" },
        ],
      },
      {
        title: "Rosé Wine",
        note: "Bottle £30 · 250ml glass £10",
        items: [
          { name: "Pinot Grigio Rosé Delle Venezie" },
          { name: "Crescendo White Zinfandel Rosé" },
          { name: "Bardolino Chiaretto Rosé" },
        ],
      },
    ],
  },
  {
    id: "champagne",
    label: "Champagne",
    icon: "🥂",
    accent: "from-gold-300/20 to-yellow-400/10",
    subsections: [
      {
        title: "Champagne",
        items: [
          { name: "Laurent Perrier", price: "£120" },
          { name: "Moët & Chandon", price: "£120" },
          { name: "Belaire Rosé", price: "£120" },
          { name: "Martini Prosecco", price: "£50" },
        ],
      },
      {
        title: "Single Malt Whisky",
        items: [
          { name: "Glen 12", price: "£120" },
          { name: "Glen 15", price: "£150" },
          { name: "Glen 18", price: "£200" },
          { name: "Glen 21", price: "£300" },
          { name: "Glenmorangie", price: "£100" },
        ],
      },
    ],
  },
  {
    id: "spirits",
    label: "Spirits",
    icon: "🥃",
    accent: "from-indigo-500/20 to-blue-500/10",
    note: "25ml £8 · 50ml £13",
    subsections: [
      {
        title: "Cognac",
        items: [
          { name: "Courvoisier" },
          { name: "Hennessy" },
          { name: "Rémy Martin" },
          { name: "Martell" },
        ],
      },
      {
        title: "Vodka",
        items: [
          { name: "Absolut" },
          { name: "Cîroc" },
          { name: "Smirnoff" },
          { name: "Belvedere" },
        ],
      },
      {
        title: "Whiskey",
        items: [
          { name: "Jack Daniel's" },
          { name: "Jameson Irish Whiskey" },
          { name: "Johnnie Walker" },
          { name: "Southern Comfort" },
        ],
      },
      {
        title: "Rum",
        items: [
          { name: "Bacardi" },
          { name: "Captain Morgan" },
          { name: "Captain Morgan Spiced" },
          { name: "Mount Gay Rum" },
          { name: "Wray and Nephew" },
        ],
      },
      {
        title: "Gin",
        items: [
          { name: "Bombay Sapphire" },
          { name: "Gordon's" },
          { name: "Hendrick's" },
          { name: "Tanqueray" },
        ],
      },
    ],
  },
  {
    id: "liqueurs",
    label: "Liqueurs",
    icon: "🍸",
    accent: "from-orange-500/20 to-red-500/10",
    note: "25ml £8 · 50ml £13",
    items: [
      { name: "Bailey's Irish Cream" },
      { name: "Disaronno" },
      { name: "Jägermeister" },
      { name: "Malibu" },
      { name: "Tequila" },
    ],
  },
  {
    id: "locals",
    label: "Locals",
    icon: "🌴",
    accent: "from-emerald-500/20 to-teal-500/10",
    items: [
      { name: "Palm Wine", abv: "4%", price: "£12", desc: "Fermented palm tree sap" },
      { name: "Origin Bitters", abv: "30%", price: "£10", desc: "Spirit drink with African herb extracts" },
      { name: "Kopparberg 0%", price: "£10", desc: "Non-alcoholic fruit cider" },
      { name: "Nozeco", price: "£20", desc: "Non-alcoholic sparkling wine — natural grape profile with fine bubbles" },
    ],
  },
  {
    id: "soft",
    label: "Soft Drinks",
    icon: "🧃",
    accent: "from-sky-500/20 to-blue-400/10",
    subsections: [
      {
        title: "Juice — £5",
        items: [
          { name: "Orange" },
          { name: "Apple" },
          { name: "Pineapple" },
          { name: "Cranberry" },
        ],
      },
      {
        title: "Minerals",
        items: [
          { name: "Coke / Diet Coke / Coke Zero", price: "£4" },
          { name: "Fanta", price: "£6" },
          { name: "Sprite / Red Bull / Chaps (Chapman)", price: "£5" },
          { name: "Lemonade / Ginger Ale / Appetiser", price: "£5" },
          { name: "Malt / Bitter Lemon", price: "£5" },
          { name: "Soda Water / J20", price: "£3" },
        ],
      },
      {
        title: "Water",
        items: [
          { name: "Still / Sparkling 330ml", price: "£5" },
          { name: "Still / Sparkling 750ml", price: "£7" },
          { name: "Tome Still Water", price: "£5" },
        ],
      },
    ],
  },
  {
    id: "hot",
    label: "Hot Drinks",
    icon: "☕",
    accent: "from-orange-400/20 to-amber-300/10",
    items: [
      { name: "Hot Chocolate", price: "£5", desc: "Chocolate malt beverage with minerals and vitamins" },
      { name: "Lipton Yellow Label Tea", price: "£8" },
      { name: "Ginger Tea", price: "£8", desc: "Honey infused ginger tea" },
    ],
  },
];
