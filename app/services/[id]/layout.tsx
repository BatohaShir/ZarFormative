import type { Metadata } from "next";
import {
  ServiceSchema,
  BreadcrumbSchema,
  LocalBusinessSchema,
} from "@/components/structured-data";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://uilchilgee.mn";

// Mock services data - in production, fetch from database
const services: Record<
  string,
  {
    id: number;
    title: string;
    description: string;
    fullDescription: string;
    price: string;
    category: string;
    city: string;
    image: string;
    provider: {
      name: string;
      avatar: string;
      rating: number;
      reviews: number;
    };
  }
> = {
  "1": {
    id: 1,
    title: "Орон сууцны засвар",
    description: "Мэргэжлийн баг, чанартай ажил",
    fullDescription:
      "Бид таны орон сууцыг мэргэжлийн түвшинд засварлана. Хана будах, шал засах, цахилгаан, сантехникийн бүх төрлийн ажлыг гүйцэтгэнэ.",
    price: "50,000₮-с",
    category: "Засвар",
    city: "Улаанбаатар",
    image:
      "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&h=600&fit=crop",
    provider: {
      name: "Болд Констракшн",
      avatar:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
      rating: 4.8,
      reviews: 127,
    },
  },
  "2": {
    id: 2,
    title: "Гэрийн цэвэрлэгээ",
    description: "Өдөр бүр, долоо хоног бүр",
    fullDescription:
      "Гэр, оффисын цэвэрлэгээний мэргэжлийн үйлчилгээ. Цонх угаах, хивс цэвэрлэх, ерөнхий цэвэрлэгээ.",
    price: "30,000₮-с",
    category: "Цэвэрлэгээ",
    city: "Улаанбаатар",
    image:
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=600&fit=crop",
    provider: {
      name: "Цэвэр Гэр",
      avatar:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
      rating: 4.9,
      reviews: 89,
    },
  },
  "3": {
    id: 3,
    title: "Компьютер засвар",
    description: "Бүх төрлийн техник засвар",
    fullDescription:
      "Компьютер, зөөврийн компьютер, таблет болон бусад электрон төхөөрөмжийн засвар үйлчилгээ.",
    price: "20,000₮-с",
    category: "Техник",
    city: "Дархан",
    image:
      "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&h=600&fit=crop",
    provider: {
      name: "ТехМастер",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
      rating: 4.7,
      reviews: 203,
    },
  },
  "4": {
    id: 4,
    title: "Англи хэлний хичээл",
    description: "Туршлагатай багш, онлайн/офлайн",
    fullDescription:
      "IELTS, TOEFL бэлтгэл, ярианы англи хэл, бизнесийн англи хэл зэрэг бүх түвшний сургалт.",
    price: "40,000₮/цаг",
    category: "Сургалт",
    city: "Улаанбаатар",
    image:
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=600&fit=crop",
    provider: {
      name: "Сараа багш",
      avatar:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
      rating: 5.0,
      reviews: 156,
    },
  },
  "5": {
    id: 5,
    title: "Ачаа тээвэр",
    description: "Хот доторх болон хот хоорондын",
    fullDescription:
      "Бүх төрлийн ачаа тээвэр, нүүлгэлтийн үйлчилгээ. Хот дотор болон хот хоорондын тээвэр.",
    price: "80,000₮-с",
    category: "Тээвэр",
    city: "Улаанбаатар",
    image:
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=600&fit=crop",
    provider: {
      name: "Хурд Логистик",
      avatar:
        "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop",
      rating: 4.6,
      reviews: 312,
    },
  },
  "6": {
    id: 6,
    title: "Гоо сайхны үйлчилгээ",
    description: "Үс засалт, гоо сайхан",
    fullDescription:
      "Үс засалт, будалт, маникюр, педикюр, нүүр будалт зэрэг гоо сайхны бүх төрлийн үйлчилгээ.",
    price: "15,000₮-с",
    category: "Гоо сайхан",
    city: "Эрдэнэт",
    image:
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=600&fit=crop",
    provider: {
      name: "Гоо Студио",
      avatar:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
      rating: 4.9,
      reviews: 245,
    },
  },
  "7": {
    id: 7,
    title: "Веб хөгжүүлэлт",
    description: "Вебсайт, апп хөгжүүлэлт",
    fullDescription:
      "Вебсайт, гар утасны апп, онлайн дэлгүүр зэрэг бүх төрлийн програм хангамжийн хөгжүүлэлт.",
    price: "500,000₮-с",
    category: "IT",
    city: "Улаанбаатар",
    image:
      "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=600&fit=crop",
    provider: {
      name: "КодМастер",
      avatar:
        "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop",
      rating: 4.8,
      reviews: 67,
    },
  },
  "8": {
    id: 8,
    title: "Авто засвар",
    description: "Бүх төрлийн авто засвар",
    fullDescription:
      "Бүх төрлийн автомашины засвар үйлчилгээ. Хөдөлгүүр, хурдны хайрцаг, тоормос, цахилгаан систем.",
    price: "30,000₮-с",
    category: "Авто",
    city: "Улаанбаатар",
    image:
      "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=800&h=600&fit=crop",
    provider: {
      name: "АвтоПро Сервис",
      avatar:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop",
      rating: 4.7,
      reviews: 189,
    },
  },
};

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const service = services[id];

  if (!service) {
    return {
      title: "Үйлчилгээ олдсонгүй",
      description: "Хайсан үйлчилгээ олдсонгүй",
    };
  }

  const title = `${service.title} - ${service.city}`;
  const description = `${service.fullDescription} ${service.provider.name} - ${service.price}`;
  const url = `${siteUrl}/services/${id}`;

  return {
    title,
    description,
    keywords: [
      service.title,
      service.category,
      service.city,
      service.provider.name,
      "үйлчилгээ",
      "Монгол",
    ],
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: [
        {
          url: service.image,
          width: 800,
          height: 600,
          alt: service.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [service.image],
    },
    alternates: {
      canonical: url,
    },
  };
}

export default function ServiceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  // We need to handle the promise synchronously for the layout
  // The actual service data will be loaded in the page component
  return (
    <>
      {children}
      <ServiceSchemaWrapper params={params} />
    </>
  );
}

async function ServiceSchemaWrapper({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = services[id];

  if (!service) {
    return null;
  }

  const url = `${siteUrl}/services/${id}`;

  return (
    <>
      <ServiceSchema
        name={service.title}
        description={service.fullDescription}
        provider={{
          name: service.provider.name,
          image: service.provider.avatar,
        }}
        serviceType={service.category}
        areaServed={service.city}
        price={service.price}
        image={service.image}
        url={url}
        rating={service.provider.rating}
        reviewCount={service.provider.reviews}
      />
      <LocalBusinessSchema
        name={service.provider.name}
        image={service.provider.avatar}
        address={{ city: service.city }}
        rating={service.provider.rating}
        reviewCount={service.provider.reviews}
        url={url}
      />
      <BreadcrumbSchema
        items={[
          { name: "Нүүр", url: siteUrl },
          { name: "Үйлчилгээ", url: `${siteUrl}/services` },
          { name: service.category, url: `${siteUrl}/services?categories=${encodeURIComponent(service.category)}` },
          { name: service.title, url },
        ]}
      />
    </>
  );
}
