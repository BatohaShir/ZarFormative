import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PublicProfileClient } from "./public-profile-client";

// OPTIMIZATION: Revalidate every 5 minutes
export const revalidate = 300;

// Types for optimized queries
interface ProfileData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  is_company: boolean;
  avatar_url: string | null;
  about: string | null;
  phone_number: string | null;
  created_at: Date;
  role: string;
  // Pre-aggregated stats from DB
  avg_rating: number | null;
  reviews_count: number;
  completed_jobs_count: number;
}

interface ListingData {
  id: string;
  title: string;
  slug: string;
  price: number | null;
  is_negotiable: boolean;
  category: { id: string; name: string; slug: string } | null;
  images: { id: string; url: string; alt: string | null }[];
  aimag: { name: string } | null;
}

// OPTIMIZATION: Cache profile data for 5 minutes
const getProfileById = unstable_cache(
  async (userId: string): Promise<ProfileData | null> => {
    const profile = await prisma.profiles.findUnique({
      where: { id: userId },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        company_name: true,
        is_company: true,
        avatar_url: true,
        about: true,
        phone_number: true,
        created_at: true,
        role: true,
        // Use pre-aggregated fields instead of loading all reviews/requests
        avg_rating: true,
        reviews_count: true,
        completed_jobs_count: true,
      },
    });

    if (!profile) return null;

    return {
      ...profile,
      avg_rating: profile.avg_rating ? Number(profile.avg_rating) : null,
    };
  },
  ["profile-by-id"],
  { revalidate: 300, tags: ["profiles"] }
);

// OPTIMIZATION: Cache listings for 5 minutes, limit to 12
const getProfileListings = unstable_cache(
  async (userId: string): Promise<ListingData[]> => {
    const listings = await prisma.listings.findMany({
      where: {
        user_id: userId,
        is_active: true,
        status: "active",
      },
      select: {
        id: true,
        title: true,
        slug: true,
        price: true,
        is_negotiable: true,
        category: {
          select: { id: true, name: true, slug: true },
        },
        images: {
          where: { is_cover: true },
          select: { id: true, url: true, alt: true },
          take: 1,
        },
        aimag: {
          select: { name: true },
        },
      },
      orderBy: { created_at: "desc" },
      take: 12, // OPTIMIZATION: Limit listings
    });

    return listings.map((l) => ({
      ...l,
      price: l.price ? Number(l.price) : null,
    }));
  },
  ["profile-listings"],
  { revalidate: 300, tags: ["listings"] }
);

// OPTIMIZATION: Get failed jobs count from DB aggregate
const getFailedJobsCount = unstable_cache(
  async (userId: string): Promise<number> => {
    const count = await prisma.listing_requests.count({
      where: {
        provider_id: userId,
        status: {
          in: ["rejected", "cancelled_by_provider"],
        },
      },
    });
    return count;
  },
  ["profile-failed-jobs"],
  { revalidate: 300, tags: ["requests"] }
);

interface PageProps {
  params: Promise<{ name: string }>;
}

export default async function AccountPage({ params }: PageProps) {
  const { name } = await params;

  // Profile ID is always UUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name);

  if (!isUUID) {
    notFound();
  }

  // Parallel data fetching - no waterfall
  const [profile, listings, failedJobsCount] = await Promise.all([
    getProfileById(name),
    getProfileListings(name),
    getFailedJobsCount(name),
  ]);

  if (!profile) {
    notFound();
  }

  // Calculate stats from pre-aggregated fields
  const stats = {
    rating: profile.avg_rating || 0,
    reviewsCount: profile.reviews_count,
    completedCount: profile.completed_jobs_count,
    failedCount: failedJobsCount,
  };

  return (
    <PublicProfileClient
      profile={profile}
      listings={listings}
      stats={stats}
    />
  );
}
