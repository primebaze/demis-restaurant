import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // The only dark backgrounds on the site. See docs/COLOURS.md.
        ink: {
          950: '#111111',
          900: '#1a1a1a',
          800: '#222222',
          700: '#2a2a2a',
          600: '#333333',
        },
        cream: {
          DEFAULT: '#f5f0eb',
          50: '#faf8f5',
          100: '#f5f0eb',
          200: '#ebe4db',
          300: '#ddd3c6',
          400: '#c4b8a8',
          500: '#a89a8a',
          600: '#8c7e6e',
          700: '#706353',
          800: '#544a3b',
          900: '#3a322a',
        },
        // Burnt orange from the printed bottomless brunch poster.
        brunch: {
          300: '#e8a074',
          400: '#e08a52',
          500: '#d4733c',
          600: '#b85e2c',
        },
        // Admin only: booking dots, guest requirements, initials circles. See docs/COLOURS.md, "Admin".
        ember: {
          50: '#f5e0d3',
          100: '#fde6dc',
          400: '#ee6a35',
          600: '#c4441a',
          700: '#a8391a',
        },
        // Admin panels: warm ivory instead of pure white, so screens don't glare. Admin only. See docs/COLOURS.md, "Admin".
        sand: {
          50: '#fbf1eb',
          100: '#f6e9e0',
          200: '#f0e0d5',
          300: '#e6d3c5',
        },
        // The admin's gold: brighter and cleaner than gold-300 on white. Admin only. See docs/COLOURS.md, "Admin".
        honey: {
          100: '#fdf5dc',
          200: '#f9e6ae',
          300: '#f4d47f',
          400: '#e8bd4f',
        },
        gold: {
          DEFAULT: '#e8cc9c',
          50: '#fdf8f0',
          100: '#f9efdb',
          200: '#f3e0b8',
          300: '#e8cc9c',
          400: '#d4b278',
          500: '#c09a58',
          600: '#a88040',
          700: '#8c6834',
          800: '#71522b',
          900: '#5a4224',
        },
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-display)', 'Georgia', 'serif'],
        outfit: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
export default config;
