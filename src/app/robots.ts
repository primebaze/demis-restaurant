import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/blog/admin", "/dashboard", "/checkout", "/api", "/shoot-plans/"],
      },
    ],
    sitemap: "https://www.demisrestaurant.co.uk/sitemap.xml",
  };
}
