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
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
export default config;
