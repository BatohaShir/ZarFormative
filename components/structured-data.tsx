// JSON-LD Structured Data Components for SEO
// https://schema.org/

interface OrganizationSchemaProps {
  name?: string;
  url?: string;
  logo?: string;
  description?: string;
}

export function OrganizationSchema({
  name = "Tsogts.mn",
  url = "https://tsogts.mn",
  logo = "https://tsogts.mn/logo.png",
  description = "Монголын хамгийн том үйлчилгээний платформ",
}: OrganizationSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url,
    logo,
    description,
    sameAs: [
      "https://facebook.com/tsogts.mn",
      "https://instagram.com/tsogts.mn",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["mn", "en"],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface WebsiteSchemaProps {
  name?: string;
  url?: string;
  description?: string;
}

export function WebsiteSchema({
  name = "Tsogts.mn",
  url = "https://tsogts.mn",
  description = "Монголын хамгийн том үйлчилгээний платформ",
}: WebsiteSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url,
    description,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${url}/services?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface ServiceSchemaProps {
  name: string;
  description: string;
  provider: {
    name: string;
    image?: string;
  };
  serviceType: string;
  areaServed: string;
  price?: string;
  image?: string;
  url: string;
  rating?: number;
  reviewCount?: number;
}

export function ServiceSchema({
  name,
  description,
  provider,
  serviceType,
  areaServed,
  price,
  image,
  url,
  rating,
  reviewCount,
}: ServiceSchemaProps) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    provider: {
      "@type": "LocalBusiness",
      name: provider.name,
      image: provider.image,
    },
    serviceType,
    areaServed: {
      "@type": "City",
      name: areaServed,
    },
    url,
  };

  if (image) {
    schema.image = image;
  }

  if (price) {
    schema.offers = {
      "@type": "Offer",
      price: price.replace(/[^0-9]/g, ""),
      priceCurrency: "MNT",
      availability: "https://schema.org/InStock",
    };
  }

  if (rating && reviewCount) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: rating,
      reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface LocalBusinessSchemaProps {
  name: string;
  description?: string;
  image?: string;
  address?: {
    city: string;
    country?: string;
  };
  rating?: number;
  reviewCount?: number;
  url: string;
}

export function LocalBusinessSchema({
  name,
  description,
  image,
  address,
  rating,
  reviewCount,
  url,
}: LocalBusinessSchemaProps) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name,
    url,
  };

  if (description) {
    schema.description = description;
  }

  if (image) {
    schema.image = image;
  }

  if (address) {
    schema.address = {
      "@type": "PostalAddress",
      addressLocality: address.city,
      addressCountry: address.country || "MN",
    };
  }

  if (rating && reviewCount) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: rating,
      reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSchemaProps {
  items: FAQItem[];
}

export function FAQSchema({ items }: FAQSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface ReviewSchemaProps {
  itemReviewed: {
    type: "Service" | "LocalBusiness";
    name: string;
  };
  author: string;
  reviewRating: number;
  reviewBody: string;
  datePublished: string;
}

export function ReviewSchema({
  itemReviewed,
  author,
  reviewRating,
  reviewBody,
  datePublished,
}: ReviewSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: {
      "@type": itemReviewed.type,
      name: itemReviewed.name,
    },
    author: {
      "@type": "Person",
      name: author,
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: reviewRating,
      bestRating: 5,
      worstRating: 1,
    },
    reviewBody,
    datePublished,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
