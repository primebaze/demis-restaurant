import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { JsonLd } from "@/components/JsonLd";
import { ScrollToTop } from "@/components/ScrollToTop";
import { LayoutShell } from "@/components/LayoutShell";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const SITE_URL = "https://demisrestaurant.co.uk";
const SITE_NAME = "Demi's Restaurant";
const SITE_DESCRIPTION =
  "Nigerian restaurant in Cricklewood, London. Enjoy jollof rice, suya, egusi soup, pounded yam and more. Dine in, takeaway, or bulk delivery across London. Book a table today.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a1a1a",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Real Nigerian Cuisine in London`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "Nigerian restaurant London",
    "African restaurant Cricklewood",
    "jollof rice London",
    "Nigerian food delivery",
    "bulk food delivery London",
    "African catering London",
    "suya London",
    "egusi soup",
    "pounded yam London",
    "Demi's Restaurant",
    "Nigerian cuisine NW2",
    "Cricklewood restaurant",
    "African food near me",
    "party food delivery London",
    "Nigerian catering service",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} | Real Nigerian Cuisine in London`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Demi's Restaurant — Real Nigerian Cuisine in London",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | Real Nigerian Cuisine in London`,
    description: SITE_DESCRIPTION,
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  category: "restaurant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${cormorant.variable}`}>
      <body className="font-sans antialiased">
        <ScrollToTop />
        <JsonLd />
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
