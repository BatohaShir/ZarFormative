import { MetadataRoute } from "next";

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

// Mock service IDs - in production, fetch from database
const serviceIds = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

// Mock provider names - in production, fetch from database
const providerNames = [
  "болд-констракшн",
  "цэвэр-гэр",
  "техмастер",
  "сараа-багш",
  "хурд-логистик",
  "гоо-студио",
  "кодмастер",
  "автопро-сервис",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

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

  // Service detail pages
  const servicePages: MetadataRoute.Sitemap = serviceIds.map((id) => ({
    url: `${siteUrl}/services/${id}`,
    lastModified: now,
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

  // Provider profile pages
  const providerPages: MetadataRoute.Sitemap = providerNames.map((name) => ({
    url: `${siteUrl}/account/${encodeURIComponent(name)}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [
    ...staticPages,
    ...servicePages,
    ...categoryPages,
    ...cityPages,
    ...providerPages,
  ];
}
