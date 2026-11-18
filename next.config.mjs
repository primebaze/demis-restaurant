import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/** Supabase origin (Storage uploads and playback in the meetings app). */
const SUPABASE_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").origin;
  } catch {
    return "https://*.supabase.co";
  }
})();

/** @param {string} phase @returns {import('next').NextConfig} */
const nextConfig = (phase) => ({
  // Keep the user's dev preview independent of production builds and test servers.
  distDir:
    process.env.NEXT_DIST_DIR ||
    (phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next"),
  experimental: {
    // Load the PDF reader (and the pdf.js engine it wraps) from node_modules at
    // runtime instead of bundling it; pdf.js does not survive webpack bundling.
    serverComponentsExternalPackages: ["pdf-parse", "pdfjs-dist"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // WebP only. Serving AVIF too doubles the Image Optimization
    // transformation count for a ~10-20% file-size gain — not worth it.
    formats: ["image/webp"],
    // Only the breakpoints we actually serve. The Next defaults go up to
    // 3840px, generating variants nobody on this site ever requests.
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [64, 128, 256, 384],
    // Cache optimized images for 31 days so repeat views don't re-transform.
    minimumCacheTTL: 2678400,
  },
  async redirects() {
    return [
      // The Saturday brunch was replaced by the Sunday Feast; old links and posts land on the new page.
      { source: "/saturday-brunch", destination: "/sunday-feast", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; frame-src https://js.stripe.com https://hooks.stripe.com https://www.google.com https://maps.google.com https://challenges.cloudflare.com; connect-src 'self' https://api.stripe.com https://vitals.vercel-insights.com; media-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';",
          },
        ],
      },
      {
        // The meetings app (meeting.demisrestaurant.co.uk, served under /meet) needs the mic and camera
        // for calls and room recordings, and talks straight to Supabase Storage for photo, document and
        // audio uploads and recording playback. These override the site-wide values above for /meet only;
        // the main site never serves /meet (see middleware).
        source: "/meet/:path*",
        headers: [
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), display-capture=(self), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; frame-src 'none'; connect-src 'self' ${SUPABASE_ORIGIN} https://vitals.vercel-insights.com; media-src 'self' blob: ${SUPABASE_ORIGIN}; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';`,
          },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
      {
        source: "/shoot-plans/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
});

export default nextConfig;
