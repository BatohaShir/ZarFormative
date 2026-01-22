import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ServiceDetailClient, ServiceNotFound, type ServiceDetailListing } from "@/components/service-detail-client";
import { formatListingPrice } from "@/lib/utils";
import { getProviderName, getFirstImageUrl } from "@/lib/formatters";

// SSR на каждый запрос
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

// Загрузка данных на сервере
async function getListingBySlug(slug: string) {
  const listing = await prisma.listings.findUnique({
    where: { slug },
    include: {
      user: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          avatar_url: true,
          company_name: true,
          is_company: true,
          created_at: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      images: {
        select: {
          id: true,
          url: true,
          sort_order: true,
          alt: true,
        },
        orderBy: {
          sort_order: "asc",
        },
      },
      aimag: {
        select: {
          id: true,
          name: true,
        },
      },
      district: {
        select: {
          id: true,
          name: true,
        },
      },
      khoroo: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!listing) return null;

  // Сериализуем Decimal в number для Client Components
  return {
    ...listing,
    price: listing.price ? Number(listing.price) : null,
  } as ServiceDetailListing;
}

// Dynamic SEO metadata для каждого объявления
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingBySlug(id);

  if (!listing) {
    return {
      title: "Үйлчилгээ олдсонгүй",
      description: "Хайсан үйлчилгээ олдсонгүй",
    };
  }

  const providerName = getProviderName(listing.user);
  const priceDisplay = formatListingPrice(listing.price, listing.currency, listing.is_negotiable);
  const imageUrl = getFirstImageUrl(listing.images);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://uilchilgee.mn";
  const fullUrl = `${siteUrl}/services/${listing.slug}`;

  // Краткое описание для meta
  const metaDescription = listing.description.length > 160
    ? listing.description.substring(0, 157) + "..."
    : listing.description;

  return {
    title: listing.title,
    description: metaDescription,
    keywords: [
      listing.category?.name || "үйлчилгээ",
      listing.aimag?.name || "Улаанбаатар",
      providerName,
      "Uilchilgee.mn",
    ].filter(Boolean),
    authors: [{ name: providerName }],
    openGraph: {
      type: "website",
      locale: "mn_MN",
      url: fullUrl,
      siteName: "Uilchilgee.mn",
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
    other: listing.price ? {
      "product:price:amount": listing.price.toString(),
      "product:price:currency": listing.currency,
    } : undefined,
  };
}

// JSON-LD Structured Data для Service schema
function ServiceJsonLd({ listing }: { listing: ServiceDetailListing }) {
  const providerName = getProviderName(listing.user);
  const priceDisplay = formatListingPrice(listing.price, listing.currency, listing.is_negotiable);
  const imageUrl = getFirstImageUrl(listing.images);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://uilchilgee.mn";

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
      name: [listing.aimag?.name, listing.district?.name, listing.khoroo?.name].filter(Boolean).join(", ") || "Монгол",
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
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default async function ServicePage({ params }: PageProps) {
  const { id } = await params;
  const listing = await getListingBySlug(id);

  if (!listing) {
    return <ServiceNotFound />;
  }

  return (
    <>
      {/* JSON-LD Structured Data */}
      <ServiceJsonLd listing={listing} />
      
      {/* Preload главного изображения */}
      <link
        rel="preload"
        as="image"
        href={getFirstImageUrl(listing.images)}
        // @ts-expect-error - fetchpriority is valid but not typed
        fetchpriority="high"
      />
      
      {/* Client Component с интерактивностью */}
      <ServiceDetailClient listing={listing} />
    </>
  );
}
