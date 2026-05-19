import { Metadata } from "next";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import {
  ServiceDetailClient,
  ServiceNotFound,
  type ServiceDetailListing,
} from "@/components/service-detail-client";
import { fetchServiceDetailBySlug, type ServiceDetailSsrData } from "@/lib/services/detail-query";
import { formatListingPrice } from "@/lib/utils";
import { getProviderName, getFirstImageUrl } from "@/lib/formatters";
import { safeJsonLd } from "@/lib/json-ld";

// No more force-dynamic. The page is the same for every visitor, so
// we can cache by slug. router.refresh()/revalidateTag("listing:<slug>")
// from a server action (edit, delete, view-bump) still busts it
// whenever the data changes.
export const revalidate = 60;

interface PageProps {
  params: Promise<{ id: string }>;
}

// Two layers of caching intentionally:
//
//   * unstable_cache(slug) — Next.js Data Cache, 60s TTL. Survives
//     across requests from different users and different Node
//     instances. First visit pays the CTE, the next hundred are
//     served from the cache.
//
//   * React.cache() — in-request memoization so generateMetadata()
//     and the page render share a single call. Without it we'd pay
//     two lookups per request even with the Data Cache warm, because
//     unstable_cache serialises the Date on user.created_at and we'd
//     unserialize twice.
const getListingBySlug = cache(async function getListingBySlug(
  slug: string
): Promise<ServiceDetailSsrData> {
  const cached = unstable_cache(() => fetchServiceDetailBySlug(slug), ["service-detail", slug], {
    revalidate: 60,
    tags: [`listing:${slug}`],
  });
  const data = await cached();
  if (!data.listing) return data;
  // unstable_cache stringifies Dates on the way through — reviving
  // here so the client types (ServiceDetailListing.user.created_at: Date)
  // stay honest.
  return {
    ...data,
    listing: {
      ...data.listing,
      user: { ...data.listing.user, created_at: new Date(data.listing.user.created_at) },
    },
  };
});

// Dynamic SEO metadata для каждого объявления
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { listing } = await getListingBySlug(id);

  if (!listing) {
    return {
      title: "Үйлчилгээ олдсонгүй",
      description: "Хайсан үйлчилгээ олдсонгүй",
    };
  }

  const providerName = getProviderName(listing.user);
  const priceDisplay = formatListingPrice(listing.price, listing.currency, listing.is_negotiable);
  const imageUrl = getFirstImageUrl(listing.images);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tsogts.mn";
  const fullUrl = `${siteUrl}/services/${listing.slug}`;

  // Краткое описание для meta
  const metaDescription =
    listing.description.length > 160
      ? listing.description.substring(0, 157) + "..."
      : listing.description;

  return {
    title: listing.title,
    description: metaDescription,
    keywords: [
      listing.category?.name || "үйлчилгээ",
      listing.aimag?.name || "Улаанбаатар",
      providerName,
      "Tsogts.mn",
    ].filter(Boolean),
    authors: [{ name: providerName }],
    openGraph: {
      type: "website",
      locale: "mn_MN",
      url: fullUrl,
      siteName: "Tsogts.mn",
      title: listing.title,
      description: metaDescription,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: listing.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: listing.title,
      description: metaDescription,
      images: [imageUrl],
    },
    alternates: {
      canonical: fullUrl,
    },
    other: listing.price
      ? {
          "product:price:amount": listing.price.toString(),
          "product:price:currency": listing.currency,
        }
      : undefined,
  };
}

// JSON-LD Structured Data для Service schema
function ServiceJsonLd({ listing }: { listing: ServiceDetailListing }) {
  const providerName = getProviderName(listing.user);
  const priceDisplay = formatListingPrice(listing.price, listing.currency, listing.is_negotiable);
  const imageUrl = getFirstImageUrl(listing.images);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tsogts.mn";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: listing.title,
    description: listing.description,
    url: `${siteUrl}/services/${listing.slug}`,
    image: imageUrl,
    provider: {
      "@type": listing.user.is_company ? "Organization" : "Person",
      name: providerName,
      url: `${siteUrl}/account/${listing.user.id}`,
    },
    areaServed: {
      "@type": "Place",
      name:
        [listing.aimag?.name, listing.district?.name, listing.khoroo?.name]
          .filter(Boolean)
          .join(", ") || "Монгол",
    },
    category: listing.category?.name,
    offers: {
      "@type": "Offer",
      price: listing.price,
      priceCurrency: listing.currency,
      availability: "https://schema.org/InStock",
    },
    aggregateRating: undefined, // TODO: добавить когда будут отзывы
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
  );
}

export default async function ServicePage({ params }: PageProps) {
  const { id } = await params;
  const { listing, reviews, reviewsTotal } = await getListingBySlug(id);

  if (!listing) {
    return <ServiceNotFound />;
  }

  // CTE returns ISO strings for review.created_at; the client's
  // ReviewWithClient type wants Date. Coerce at the boundary so the
  // ReviewsList seed doesn't drift from what's already in the cache.
  const initialReviews = reviews.map((r) => ({
    ...r,
    created_at: new Date(r.created_at),
  }));

  // Preload the main image and the next two gallery shots. LCP is
  // almost always the hero; the next two preempt scroll-driven
  // fetches with no risk because they're at the top of the page.
  const images = listing.images.slice(0, 3);

  return (
    <>
      {/* JSON-LD Structured Data */}
      <ServiceJsonLd listing={listing} />

      {/* Preload hero + next two gallery images for instant scroll. */}
      {images.map((img, i) => (
        <link
          key={img.id}
          rel="preload"
          as="image"
          href={img.url}
          // @ts-expect-error - fetchpriority is valid but not typed
          fetchpriority={i === 0 ? "high" : "low"}
        />
      ))}

      {/* Client Component с интерактивностью */}
      <ServiceDetailClient
        listing={listing}
        initialReviews={initialReviews}
        initialReviewsTotal={reviewsTotal}
      />
    </>
  );
}
