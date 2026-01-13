import { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://uilchilgee.mn";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/account/me",
          "/account/notifications",
          "/_next/",
          "/private/",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/api/", "/account/me", "/account/notifications"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
