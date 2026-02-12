import type { MetadataRoute } from "next";

const baseUrl = "https://www.autoeditor.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/editor/", "/checkout/", "/billing/", "/generate/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
