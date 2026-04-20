/* ─────────── types ─────────── */
export type MenuItem = {
  name: string;
  price?: number;
  desc: string;
  v?: boolean;
  spicy?: boolean;
};

export type MenuCategory = {
  title: string;
  subtitle?: string;
  items: MenuItem[];
};

/* ─────────── data ─────────── */
export const ALL_CATEGORIES: MenuCategory[] = [
  {
    title: "Starters",
    items: [
      { name: "Assorted Goat Meat Peppersoup", price: 15, desc: "Tender assorted goat meat cooked in peppersoup spices and scent leaf", spicy: true },
      { name: "Iseewu", price: 30, desc: "Full goat head slow cooked in a native palm oil base sauce garnished with utazi leaves and onions" },
      { name: "Peppered Snail", price: 30, desc: "Crunchy giant snails cooked in pepper sauce and mixed pepper" },
      { name: "Moimoi", price: 5, desc: "Slow cooked peeled beans blended with peppers and crayfish" },
      { name: "Chicken Wings", price: 12, desc: "Grilled marinated full wings in sweet and spicy sauce" },
      { name: "Catfish Peppersoup", price: 20, desc: "Catfish cooked in peppersoup spice and scent leaf crayfish", spicy: true },
      { name: "Nkwobi", price: 15, desc: "Boneless cowfoot cooked in a palm oil base sauce with pepper and ugba" },
      { name: "Spicy Chopped Beef", price: 14, desc: "Diced tender beef cut in spicy sauce with mixed pepper" },
      { name: "Spicy Turkey", price: 15, desc: "Smoked turkey in spicy sauce. Garnished with mixed pepper" },
      { name: "Gizzard & Plantain", price: 12, desc: "Sweet and spicy flavour. Crispy chicken gizzard and diced plantain cooked in pepper sauce" },
    ],
  },
  {
    title: "Grills",
    items: [
      { name: "Beef Suya", price: 15, desc: "Charcoal grilled succulent beef cuts served with onions, tomatoes & yaji" },
      { name: "Lamb Suya", price: 15, desc: "Charcoal grilled lamb cut served with onions, tomatoes and yaji" },
      { name: "Chicken Suya", price: 15, desc: "Charcoal grilled boneless chicken. Served with onions, tomatoes and yaji" },
      { name: "Asun", price: 15, desc: "Wood grilled spicy goat meat", spicy: true },
      { name: "Grilled Croaker", price: 30, desc: "Grilled marinated whole fish served with mix pepper and a side of fried plantain or yam" },
      { name: "Grilled Tilapia", price: 30, desc: "Grilled marinated whole fish served with mix pepper and a side of fried plantain or yam" },
    ],
  },
  {
    title: "Rice Meals",
    subtitle: "Served with plantain and your choice of protein: Assorted meat / Asun (+10) / Beef / Chicken / Fresh Fish (+5) / Goat Meat / Turkey (+3) / Fried Fish (+3)",
    items: [
      { name: "Jollof Rice", price: 26, desc: "Smoky tasty basmati rice slow cooked in our signature pepper base", v: true },
      { name: "Fried Rice", price: 20, desc: "Stir fry green rice with crispy vegetables", v: true },
      { name: "White Rice", price: 20, desc: "Lightly salted long green rice", v: true },
      { name: "White Rice with Ayamase", price: 20, desc: "White rice served with assorted meat cooked in a spicy green pepper sauce" },
      { name: "White Rice with Designer Stew", price: 20, desc: "White rice served with beef cooked in a spicy pepper sauce" },
    ],
  },
  {
    title: "Beans Meal",
    subtitle: "Served with plantain and your choice of protein: Assorted meat / Beef / Chicken / Fresh Fish (+5) / Goat Meat / Fried Fish (+3) / Turkey (+3)",
    items: [
      { name: "Plain Beans", price: 20, desc: "Honey sweet beans slow cooked for extra juiciness served with pepper sauce", v: true },
      { name: "Porridge Beans", price: 20, desc: "African sweet beans cooked in a palm oil base with pepper, onions and crayfish" },
      { name: "Ewa Aganyin", price: 20, desc: "Mashed sweet beans served with our signature aganyin sauce made from blended oil red pepper and chilli seeds", v: true },
    ],
  },
  {
    title: "Yam Meals",
    subtitle: "Served with your choice of protein: Assorted meat / Beef / Chicken / Fresh Fish (+5) / Fried Fish (+3) / Goat Meat / Turkey (+3)",
    items: [
      { name: "Yam Porridge", price: 25, desc: "Yam chunks cooked in a pepper palm oil base with vegetable, pepper and crayfish", v: true },
      { name: "Yam Peppersoup", price: 25, desc: "Yam chunks in a spicy aromatic broth and scent leaf with assorted goat meat" },
      { name: "Yam & Fried Egg", price: 25, desc: "Boiled yam served with saucy fried egg", v: true },
      { name: "Boiled Yam & Vegetable Sauce", price: 25, desc: "Boiled yam served with vegetable sauce (spinach)", v: true },
    ],
  },
  {
    title: "Seafood Special",
    subtitle: "Served with your choice of: Amala / Eba / Oat Meal / Pounded Yam / Semolina",
    items: [
      { name: "Fisherman Soup", price: 30, desc: "Half shelled mussels, squid rings, snails, king prawns, fresh fish cooked in blended cocoa-yam base with snail curl leafy finger" },
      { name: "Seafood Okra", price: 30, desc: "Mussels, squid rings, snails, king prawns and fresh fish cooked in and big cut leafy finger" },
      { name: "Seafood Eforiro", price: 30, desc: "Mussels, squid rings, snails, king prawns and fresh fish cooked in vegetable and pepper sauce" },
      { name: "Ofe Nsala", price: 30, desc: "Velvety white soup simmered with catfish and aromatic native spices" },
    ],
  },
  {
    title: "Soup Meals",
    subtitle: "Served with your choice of swallow and protein: Amala / Eba / Oat Meal / Pounded Yam / Semolina. Assorted meat / Beef / Chicken / Fresh Fish (+5) / Fried Fish (+3) / Goat Meat / Turkey (+3)",
    items: [
      { name: "Egusi", price: 20, desc: "Slow cooked, grounded melon seed with vegetables" },
      { name: "Eforiro", price: 20, desc: "Spinach cooked in a pepper base sauce with locust beans and dried prawns", v: true },
      { name: "Ewedu", price: 20, desc: "Draw soupy texture vegetable cooked with locust beans and perfect with our signature buka stew and any swallow", v: true },
      { name: "Ogbono", price: 20, desc: "Smoothly blended bush mango seeds cooked in a palm oil base with pumpkin leaves" },
      { name: "Plain Okra", price: 20, desc: "Chopped lady fingers served with buka stew", v: true },
      { name: "Groundnut Soup", price: 20, desc: "Smoothly blended peanut slow cooked with vegetables", v: true },
      { name: "Edikankong", price: 22, desc: "Blanched vegetables (waterleaf and pumpkin leaf) cooked in a palm oil base with chunks of mangala fish" },
      { name: "Afang", price: 22, desc: "Blanched vegetables (waterleaf and okazi leaf) cooked in palm oil base with chunks of mangala fish" },
      { name: "Banga", price: 22, desc: "Palm kernel extracts cooked with beletete leaves", v: true },
      { name: "Bitterleaf", price: 22, desc: "Bitterleaf vegetable cooked with blended cocoa-yam and ogiri" },
      { name: "Abula", price: 22, desc: "Blended beans sauce and ewedu and gbegiri served with buka stew traditionally served with amala to fele" },
      { name: "Mixed Okra", price: 22, desc: "Chopped lady fingers with vegetables and uziza seeds" },
      { name: "Oha", price: 22, desc: "Oha leaves cooked with blended cocoa-yam and uziza seeds" },
      { name: "Okro Ogbono", price: 22, desc: "A refined blend of silky ogbono with okra" },
    ],
  },
  {
    title: "Street Food",
    items: [
      { name: "Noodles Peppersoup", price: 20, desc: "Noodles cooked in our aromatic broth with herbs, spices and mixed peppers", v: true },
      { name: "Spaghetti", price: 20, desc: "Stir fry spaghetti with mixed pepper", v: true },
      { name: "Plantain Porridge", price: 20, desc: "Diced plantain slow cooked in a palm oil base pepper and crayfish garnish with pumpkin leaves", v: true },
      { name: "Boli & Fish with Groundnut", price: 20, desc: "Roasted plantain with smoked mackerel fish served with vegetable sauce", v: true },
    ],
  },
  {
    title: "Platters",
    items: [
      { name: "Starter Platter", price: 40, desc: "Fried plantain, spring rolls, samosa, spicy turkey & chicken wings" },
      { name: "Suya Platter", price: 50, desc: "Chicken suya, beef suya, lamb suya with fried plantain or yam" },
      { name: "Seafood Platter", price: 80, desc: "Lobster, corn, egg, boiled plantain, prawns, mussels" },
      { name: "Vegetarian Platter", price: 50, desc: "Fried yam, fried plantain/boli, beans, vegetable sauce, jollof rice or fried rice" },
    ],
  },
];
