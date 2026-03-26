import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tsogts.mn";

// Service categories for sitemap
const categories = [
  "Засвар",
  "Цэвэрлэгээ",
  "Техник",
  "Сургалт",
  "Тээвэр",
  "Гоо сайхан",
  "IT",
  "Авто",
  "Урлаг",
];

// Cities
const cities = ["Улаанбаатар", "Дархан", "Эрдэнэт"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Fetch active listings from database
  const listings = await prisma.listings.findMany({
    where: { status: "active", is_active: true },
    select: { slug: true, updated_at: true },
    take: 5000,
  });

  // Fetch provider profiles from database
  const profiles = await prisma.profiles.findMany({
    where: { is_deleted: false },
    select: { id: true, updated_at: true },
    take: 5000,
  });

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/services`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/account/me/favorites`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/account/me/requests`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];

  // Listing detail pages from database
  const listingPages: MetadataRoute.Sitemap = listings.map((listing) => ({
    url: `${siteUrl}/services/${listing.slug}`,
    lastModified: listing.updated_at || now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Category filter pages
  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${siteUrl}/services?categories=${encodeURIComponent(category)}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  // City filter pages
  const cityPages: MetadataRoute.Sitemap = cities.map((city) => ({
    url: `${siteUrl}/services?city=${encodeURIComponent(city)}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));

  // Provider profile pages from database
  const providerPages: MetadataRoute.Sitemap = profiles.map((profile) => ({
    url: `${siteUrl}/account/${profile.id}`,
    lastModified: profile.updated_at || now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...listingPages, ...categoryPages, ...cityPages, ...providerPages];
}
