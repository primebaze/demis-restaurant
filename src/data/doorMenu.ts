/*
 * The food menu door staff take orders from on the tablet.
 *
 * Copied from the printed menu used in the restaurant, which is not the same as
 * the website menu (src/data/menuData.ts). Change this file when the printed
 * menu changes; the website menu is left alone.
 *
 * Prices are in pounds. `extra` on an option is added to the dish price.
 * `note` is the short hint shown under the dish on the tablet, so staff can tell
 * a Rice Meal (with plantain and protein) from Rice only at a glance.
 */

export type DoorChoice = { title: string; options: { label: string; extra?: number }[] };
export type DoorDish = { name: string; price: number; note?: string; choices?: DoorChoice[] };
export type DoorSection = { title: string; dishes: DoorDish[] };

const opts = (...labels: (string | [string, number])[]) =>
  labels.map((l) => (Array.isArray(l) ? { label: l[0], extra: l[1] } : { label: l }));

const SWALLOW: DoorChoice = { title: "Swallow", options: opts("Amala", "Eba", "Oat Meal", "Pounded Yam", "Semolina") };

// Each protein list is in the order the printed menu gives it.
const PROTEIN_RICE: DoorChoice = {
  title: "Protein",
  options: opts("Assorted meat", ["Asun", 10], "Beef", "Chicken", ["Fresh Fish", 5], "Goat Meat", ["Turkey", 3], ["Fried Fish", 3]),
};
const PROTEIN_BEANS: DoorChoice = {
  title: "Protein",
  options: opts("Assorted meat", "Beef", "Chicken", ["Fresh Fish", 5], "Goat Meat", ["Fried Fish", 3], ["Turkey", 3]),
};
const PROTEIN_YAM_SOUP: DoorChoice = {
  title: "Protein",
  options: opts("Assorted meat", "Beef", "Chicken", ["Fresh Fish", 5], ["Fried Fish", 3], "Goat Meat", ["Turkey", 3]),
};
const SIDE_PLANTAIN_YAM: DoorChoice = { title: "Side", options: opts("Fried plantain", "Yam") };

const riceMeal = (name: string): DoorDish => ({ name, price: 20, note: "with plantain + protein", choices: [PROTEIN_RICE] });
const beansMeal = (name: string): DoorDish => ({ name, price: 20, note: "with plantain + protein", choices: [PROTEIN_BEANS] });
const yamMeal = (name: string): DoorDish => ({ name, price: 25, note: "with protein", choices: [PROTEIN_YAM_SOUP] });
const seafood = (name: string): DoorDish => ({ name, price: 30, note: "with swallow", choices: [SWALLOW] });
const soupMeal = (name: string, price: number): DoorDish => ({
  name, price, note: "with swallow + protein", choices: [SWALLOW, PROTEIN_YAM_SOUP],
});

export const DOOR_FOOD: DoorSection[] = [
  {
    title: "Starters",
    dishes: [
      { name: "Assorted Goat Meat Peppersoup", price: 15 },
      { name: "Isiewu", price: 30 },
      { name: "Peppered Snail", price: 30 },
      { name: "Moimoi", price: 5 },
      { name: "Chicken Wings", price: 12 },
      { name: "Catfish Peppersoup", price: 20 },
      { name: "Nkwobi", price: 15 },
      { name: "Spicy Chopped Beef", price: 14 },
      { name: "Spicy Turkey", price: 15 },
      { name: "Gizzard & Plantain", price: 12 },
    ],
  },
  {
    title: "Rice Meals",
    dishes: [
      riceMeal("Jollof Rice"),
      riceMeal("Fried Rice"),
      riceMeal("White Rice"),
      riceMeal("White Rice with Ayamase"),
      riceMeal("White Rice with Designer Stew"),
    ],
  },
  {
    title: "Beans Meal",
    dishes: [beansMeal("Plain Beans"), beansMeal("Porridge Beans"), beansMeal("Ewa Aganyin")],
  },
  {
    title: "Grills",
    dishes: [
      { name: "Beef Suya", price: 15 },
      { name: "Lamb Suya", price: 15 },
      { name: "Chicken Suya", price: 15 },
      { name: "Asun", price: 15 },
      { name: "Grilled Croaker", price: 30, note: "with fried plantain or yam", choices: [SIDE_PLANTAIN_YAM] },
      { name: "Grilled Tilapia", price: 30, note: "with fried plantain or yam", choices: [SIDE_PLANTAIN_YAM] },
    ],
  },
  {
    title: "Seafood Special",
    dishes: [seafood("Fisherman Soup"), seafood("Seafood Okra"), seafood("Seafood Eforiro"), seafood("Ofe Nsala")],
  },
  {
    title: "Yam Meals",
    dishes: [
      yamMeal("Yam Porridge"),
      yamMeal("Yam Peppersoup"),
      yamMeal("Yam & Fried Egg"),
      yamMeal("Boiled Yam & Vegetable Sauce"),
    ],
  },
  {
    title: "Street Food",
    dishes: [
      { name: "Spaghetti", price: 20 },
      { name: "Plantain Porridge", price: 20 },
      { name: "Boli & Fish with Groundnut", price: 20 },
    ],
  },
  {
    title: "Soup Meals",
    dishes: [
      soupMeal("Egusi", 20),
      soupMeal("Eforiro", 20),
      soupMeal("Ewedu", 20),
      soupMeal("Ogbono", 20),
      soupMeal("Plain Okra", 20),
      soupMeal("Peanut Soup", 20),
      soupMeal("Edikankong", 22),
      soupMeal("Afang", 22),
      soupMeal("Banga", 22),
      soupMeal("Bitterleaf", 22),
      soupMeal("Abula", 22),
      soupMeal("Mixed Okra", 22),
      soupMeal("Oha", 22),
      soupMeal("Okra Ogbono", 22),
    ],
  },
  {
    title: "Platter",
    dishes: [
      { name: "Starter Platter", price: 40 },
      { name: "Suya Platter", price: 50 },
      { name: "Seafood Platter", price: 80 },
      {
        name: "Vegetarian Platter", price: 50, note: "choose plantain or boli, and rice",
        choices: [
          { title: "Plantain or boli", options: opts("Fried plantain", "Boli") },
          { title: "Rice", options: opts("Jollof rice", "Fried rice") },
        ],
      },
    ],
  },
  {
    title: "Sides · Soup",
    dishes: [
      {
        name: "Soup only", price: 12, note: "no swallow, no protein",
        choices: [{
          title: "Soup",
          options: opts("Eforiro", "Egusi", "Ogbono", "Groundnut Soup", "Ewedu with Stew", "Okra with Stew",
            "Edikankong", "Afang", "Banga", "Oha", "Bitter Leaf"),
        }],
      },
      {
        name: "Soup with protein", price: 16, note: "no swallow",
        choices: [
          {
            title: "Soup",
            options: opts("Eforiro", "Egusi", "Ogbono", "Groundnut Soup", "Ewedu with Stew", "Okra with Stew", "Abula",
              "Edikankong", "Afang", "Banga", "Oha", "Bitterleaf"),
          },
          PROTEIN_YAM_SOUP,
        ],
      },
    ],
  },
  {
    title: "Sides · Rice only",
    dishes: [
      { name: "White Rice", price: 9, note: "rice only" },
      { name: "Jollof Rice", price: 10, note: "rice only" },
      { name: "Fried Rice", price: 12, note: "rice only" },
    ],
  },
  {
    title: "Sides · Beans only",
    dishes: [
      { name: "Plain Beans", price: 12, note: "beans only" },
      { name: "Ewa Aganyin", price: 12, note: "beans only" },
      { name: "Porridge Beans", price: 12, note: "beans only" },
    ],
  },
  {
    title: "Sides · Sauce and meat",
    dishes: [
      {
        name: "Sauce and meat", price: 14, note: "choose sauce and meat",
        choices: [
          { title: "Sauce", options: opts("Stewed Meat", "Spicy Sauce", "Mild Sauce", "Pot Sauce", "Ayamase Sauce", "Designer Stew") },
          { title: "Meat", options: opts("Assorted Meat", "Chicken", "Beef", "Goat Meat") },
        ],
      },
    ],
  },
  {
    title: "Extras",
    dishes: [
      { name: "Fried Yam", price: 10 },
      { name: "Fried Plantain", price: 8 },
      { name: "Extra Swallow", price: 5, note: "choose swallow", choices: [SWALLOW] },
      { name: "Boli", price: 10 },
      { name: "Potato Fries", price: 8 },
      { name: "Sweet Potato Fries", price: 7 },
      { name: "Chicken", price: 10 },
      {
        name: "1 Piece of Meat", price: 5, note: "choose meat",
        choices: [{ title: "Meat", options: opts("Goat", "Shaki", "Cowleg", "Beef") }],
      },
      { name: "Salad", price: 10 },
      { name: "Yam Porridge", price: 15 },
    ],
  },
  {
    title: "Dessert",
    dishes: [
      { name: "Ogi Coconut Pudding", price: 10 },
      { name: "Cheesecake", price: 10 },
      { name: "Ice Burst", price: 10 },
    ],
  },
];
