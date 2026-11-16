import { NextResponse } from "next/server";

/** Home-screen app details for Demi's Meetings (served at /meet/manifest.webmanifest). */
export function GET() {
  return NextResponse.json(
    {
      name: "Demi's Meetings",
      short_name: "Demi's",
      description: "Rota, tasks, news and meetings for the Demi's team",
      id: "/meet",
      start_url: "/meet",
      scope: "/meet",
      display: "standalone",
      orientation: "portrait",
      background_color: "#111111",
      theme_color: "#111111",
      icons: [
        { src: "/meet/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/meet/icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "/meet/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } },
  );
}
