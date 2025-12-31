"use client";

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthModal } from "@/components/auth-modal";
import { FavoritesButton } from "@/components/favorites-button";
import { MessagesButton } from "@/components/messages-button";
import { useFavorites } from "@/contexts/favorites-context";
import { useAuth } from "@/contexts/auth-context";
import { ServiceRequestModal } from "@/components/service-request-modal";
import { LoginPromptModal } from "@/components/login-prompt-modal";
import { ChevronLeft, MapPin, Share2, Heart, Clock, Star, CheckCircle, ThumbsUp, ThumbsDown, MessageSquare, UserCircle, Hourglass } from "lucide-react";

const services: Record<string, {
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
    memberSince: string;
    verified: boolean;
    successfulServices: number;
    failedServices: number;
    likes: number;
  };
  features: string[];
  reviews: {
    id: number;
    author: string;
    avatar: string;
    rating: number;
    date: string;
    comment: string;
    helpful: number;
  }[];
}> = {
  "1": {
    id: 1,
    title: "Орон сууцны засвар",
    description: "Мэргэжлийн баг, чанартай ажил",
    fullDescription: "Бид таны орон сууцыг мэргэжлийн түвшинд засварлана. Хана будах, шал засах, цахилгаан, сантехникийн бүх төрлийн ажлыг гүйцэтгэнэ. 10 жилийн туршлагатай баг таны төсөвт тохирсон шийдлийг санал болгоно.",
    price: "50,000₮-с",
    category: "Засвар",
    city: "Улаанбаатар",
    image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&h=600&fit=crop",
    provider: {
      name: "Болд Констракшн",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
      rating: 4.8,
      reviews: 127,
      memberSince: "2021",
      verified: true,
      successfulServices: 245,
      failedServices: 3,
      likes: 892,
    },
    features: ["Үнэгүй үнэлгээ", "Баталгаат ажил", "Материал хамт", "24/7 холбогдох"],
    reviews: [
      {
        id: 1,
        author: "Батбаяр Д.",
        avatar: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop",
        rating: 5,
        date: "2024-12-15",
        comment: "Маш сайн ажилласан. Цаг баримталсан, чанартай ажил хийсэн. Дахин хандана.",
        helpful: 12,
      },
      {
        id: 2,
        author: "Оюунаа Б.",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
        rating: 5,
        date: "2024-12-10",
        comment: "Гэрийн засварыг маш сайн хийлээ. Үнэ тохирсон, ажлын чанар өндөр байсан.",
        helpful: 8,
      },
      {
        id: 3,
        author: "Төмөр Г.",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
        rating: 4,
        date: "2024-12-05",
        comment: "Ерөнхийдөө сайн ажилласан. Бага зэрэг хоцорсон ч ажлын чанар сайн байсан.",
        helpful: 5,
      },
      {
        id: 4,
        author: "Сарангэрэл М.",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
        rating: 5,
        date: "2024-11-28",
        comment: "Угаалгын өрөөний засварыг төгс хийсэн. Мэргэжлийн түвшинд ажилласан.",
        helpful: 15,
      },
      {
        id: 5,
        author: "Энхбаатар Н.",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
        rating: 5,
        date: "2024-11-20",
        comment: "Гал тогооны засварыг маш өндөр түвшинд хийсэн. Бүх зүйлийг цэвэрхэн дуусгасан.",
        helpful: 9,
      },
      {
        id: 6,
        author: "Нарангэрэл Ц.",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
        rating: 4,
        date: "2024-11-15",
        comment: "Хурдан ажилласан, материалын чанар сайн байсан. Үнэ бага зэрэг өндөр.",
        helpful: 6,
      },
      {
        id: 7,
        author: "Ганбаатар Э.",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
        rating: 5,
        date: "2024-11-10",
        comment: "Шалны засварыг маш сайн хийсэн. Тааз, хана бүгд цэвэрхэн болсон.",
        helpful: 11,
      },
      {
        id: 8,
        author: "Болормаа Ж.",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop",
        rating: 5,
        date: "2024-11-05",
        comment: "Найдвартай компани. Засварын дараа 1 жилийн баталгаа өгсөн.",
        helpful: 18,
      },
      {
        id: 9,
        author: "Тэмүүлэн С.",
        avatar: "https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=100&h=100&fit=crop",
        rating: 4,
        date: "2024-10-28",
        comment: "Сайн ажилласан. Зөвхөн материал авахад удсан, бусад нь сайн.",
        helpful: 4,
      },
      {
        id: 10,
        author: "Мөнхцэцэг Б.",
        avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop",
        rating: 5,
        date: "2024-10-20",
        comment: "Маш мэргэжлийн баг. Цонх, хаалгыг бүгдийг шинээр солисон. Гайхалтай!",
        helpful: 22,
      },
    ],
  },
  "2": {
    id: 2,
    title: "Гэрийн цэвэрлэгээ",
    description: "Өдөр бүр, долоо хоног бүр",
    fullDescription: "Гэр, оффисын цэвэрлэгээний мэргэжлийн үйлчилгээ. Цонх угаах, хивс цэвэрлэх, ерөнхий цэвэрлэгээ зэрэг бүх төрлийн үйлчилгээг үзүүлнэ. Экологийн цэвэр бодис ашиглана.",
    price: "30,000₮-с",
    category: "Цэвэрлэгээ",
    city: "Улаанбаатар",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=600&fit=crop",
    provider: {
      name: "Цэвэр Гэр",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
      rating: 4.9,
      reviews: 89,
      memberSince: "2022",
      verified: true,
      successfulServices: 178,
      failedServices: 2,
      likes: 654,
    },
    features: ["Экологийн бодис", "Хурдан үйлчилгээ", "Найдвартай ажилтан", "Тогтмол хөнгөлөлт"],
    reviews: [],
  },
  "3": {
    id: 3,
    title: "Компьютер засвар",
    description: "Бүх төрлийн техник засвар",
    fullDescription: "Компьютер, зөөврийн компьютер, таблет болон бусад электрон төхөөрөмжийн засвар үйлчилгээ. Вирус цэвэрлэх, систем суулгах, эд анги солих зэрэг бүх төрлийн ажлыг гүйцэтгэнэ.",
    price: "20,000₮-с",
    category: "Техник",
    city: "Дархан",
    image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&h=600&fit=crop",
    provider: {
      name: "ТехМастер",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
      rating: 4.7,
      reviews: 203,
      memberSince: "2020",
      verified: true,
      successfulServices: 412,
      failedServices: 8,
      likes: 1203,
    },
    features: ["Үнэгүй оношлогоо", "Гэрт очиж засна", "Сэлбэг баталгаатай", "Яаралтай засвар"],
    reviews: [],
  },
  "4": {
    id: 4,
    title: "Англи хэлний хичээл",
    description: "Туршлагатай багш, онлайн/офлайн",
    fullDescription: "IELTS, TOEFL бэлтгэл, ярианы англи хэл, бизнесийн англи хэл зэрэг бүх түвшний сургалт. 8 жилийн туршлагатай, гадаадад суралцсан багш заана. Онлайн болон танхимын хичээл сонголттой.",
    price: "40,000₮/цаг",
    category: "Сургалт",
    city: "Улаанбаатар",
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=600&fit=crop",
    provider: {
      name: "Сараа багш",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
      rating: 5.0,
      reviews: 156,
      memberSince: "2019",
      verified: true,
      successfulServices: 320,
      failedServices: 0,
      likes: 1567,
    },
    features: ["Үнэгүй туршилт", "Уян хуваарь", "Онлайн хичээл", "Сертификат олгоно"],
    reviews: [],
  },
  "5": {
    id: 5,
    title: "Ачаа тээвэр",
    description: "Хот доторх болон хот хоорондын",
    fullDescription: "Бүх төрлийн ачаа тээвэр, нүүлгэлтийн үйлчилгээ. Хот дотор болон хот хоорондын тээвэр. Ачаа буулгагч хамт явна. Даатгалтай тээвэр.",
    price: "80,000₮-с",
    category: "Тээвэр",
    city: "Улаанбаатар",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=600&fit=crop",
    provider: {
      name: "Хурд Логистик",
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop",
      rating: 4.6,
      reviews: 312,
      memberSince: "2018",
      verified: true,
      successfulServices: 856,
      failedServices: 12,
      likes: 2341,
    },
    features: ["Даатгалтай", "GPS хяналт", "Ачигч хамт", "24 цаг ажиллана"],
    reviews: [],
  },
  "6": {
    id: 6,
    title: "Гоо сайхны үйлчилгээ",
    description: "Үс засалт, гоо сайхан",
    fullDescription: "Үс засалт, будалт, маникюр, педикюр, нүүр будалт зэрэг гоо сайхны бүх төрлийн үйлчилгээг мэргэжлийн түвшинд үзүүлнэ. Хуримын болон онцгой арга хэмжээний будалт хийнэ.",
    price: "15,000₮-с",
    category: "Гоо сайхан",
    city: "Эрдэнэт",
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=600&fit=crop",
    provider: {
      name: "Гоо Студио",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
      rating: 4.9,
      reviews: 245,
      memberSince: "2020",
      verified: true,
      successfulServices: 534,
      failedServices: 4,
      likes: 1876,
    },
    features: ["Чанартай бүтээгдэхүүн", "Урьдчилан захиалга", "Гэрт очно", "Хөнгөлөлт"],
    reviews: [],
  },
  "7": {
    id: 7,
    title: "Веб хөгжүүлэлт",
    description: "Вебсайт, апп хөгжүүлэлт",
    fullDescription: "Вебсайт, гар утасны апп, онлайн дэлгүүр зэрэг бүх төрлийн програм хангамжийн хөгжүүлэлт. React, Next.js, React Native технологи ашиглана. SEO оновчлол хамт хийнэ.",
    price: "500,000₮-с",
    category: "IT",
    city: "Улаанбаатар",
    image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=600&fit=crop",
    provider: {
      name: "КодМастер",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop",
      rating: 4.8,
      reviews: 67,
      memberSince: "2021",
      verified: true,
      successfulServices: 89,
      failedServices: 2,
      likes: 456,
    },
    features: ["Үнэгүй зөвлөгөө", "Техник дэмжлэг", "SEO оновчлол", "Хостинг хамт"],
    reviews: [],
  },
  "8": {
    id: 8,
    title: "Авто засвар",
    description: "Бүх төрлийн авто засвар",
    fullDescription: "Бүх төрлийн автомашины засвар үйлчилгээ. Хөдөлгүүр, хурдны хайрцаг, тоормос, цахилгаан систем зэрэг бүх төрлийн засварыг мэргэжлийн түвшинд гүйцэтгэнэ.",
    price: "30,000₮-с",
    category: "Авто",
    city: "Улаанбаатар",
    image: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=800&h=600&fit=crop",
    provider: {
      name: "АвтоПро Сервис",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop",
      rating: 4.7,
      reviews: 189,
      memberSince: "2019",
      verified: true,
      successfulServices: 623,
      failedServices: 9,
      likes: 1432,
    },
    features: ["Үнэгүй оношлогоо", "Оригинал сэлбэг", "Баталгаа 6 сар", "Авах хүргэх"],
    reviews: [],
  },
};

// Storage key for pending requests
const PENDING_REQUESTS_KEY = "uilchilgee_pending_requests";

interface PendingRequest {
  serviceId: string;
  expiresAt: number; // timestamp
}

function getPendingRequests(): PendingRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(PENDING_REQUESTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function savePendingRequest(serviceId: string) {
  const requests = getPendingRequests().filter(r => r.serviceId !== serviceId);
  const expiresAt = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
  requests.push({ serviceId, expiresAt });
  localStorage.setItem(PENDING_REQUESTS_KEY, JSON.stringify(requests));
}

function isPendingRequest(serviceId: string): { pending: boolean; expiresAt: number | null } {
  const requests = getPendingRequests();
  const request = requests.find(r => r.serviceId === serviceId);
  if (request && request.expiresAt > Date.now()) {
    return { pending: true, expiresAt: request.expiresAt };
  }
  return { pending: false, expiresAt: null };
}

function formatTimeRemaining(expiresAt: number): string {
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return "00:00:00";

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export default function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { isAuthenticated } = useAuth();
  const [requestModalOpen, setRequestModalOpen] = React.useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = React.useState(false);
  const [requestPending, setRequestPending] = React.useState(false);
  const [timeRemaining, setTimeRemaining] = React.useState<string | null>(null);
  const [expiresAt, setExpiresAt] = React.useState<number | null>(null);
  const service = services[id];

  // Check pending status on mount
  React.useEffect(() => {
    const status = isPendingRequest(id);
    if (status.pending && status.expiresAt) {
      setRequestPending(true);
      setExpiresAt(status.expiresAt);
    }
  }, [id]);

  // Timer update
  React.useEffect(() => {
    if (!requestPending || !expiresAt) return;

    const updateTimer = () => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        setRequestPending(false);
        setExpiresAt(null);
        setTimeRemaining(null);
      } else {
        setTimeRemaining(formatTimeRemaining(expiresAt));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [requestPending, expiresAt]);

  const handleServiceRequest = () => {
    if (isAuthenticated) {
      setRequestModalOpen(true);
    } else {
      setShowLoginPrompt(true);
    }
  };

  const handleRequestSent = () => {
    savePendingRequest(id);
    const newExpiresAt = Date.now() + 2 * 60 * 60 * 1000;
    setRequestPending(true);
    setExpiresAt(newExpiresAt);
  };

  const handleShare = async () => {
    const shareData = {
      title: service?.title || "Үйлчилгээ",
      text: service?.description || "",
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(window.location.href);
      alert("Холбоос хуулагдлаа!");
    }
  };

  const handleSave = () => {
    if (service) {
      toggleFavorite(service.id);
    }
  };

  if (!service) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl md:text-2xl font-bold mb-4">Үйлчилгээ олдсонгүй</h1>
          <Link href="/">
            <Button>Нүүр хуудас руу буцах</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-20 lg:pb-0">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-3 md:px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:h-10 md:w-10"
              onClick={() => router.back()}
            >
              <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <Link href="/" className="hidden sm:block">
              <h1 className="text-lg md:text-2xl font-bold">
                <span className="text-[#c4272f]">Uilc</span>
                <span className="text-[#015197]">hilge</span>
                <span className="text-[#c4272f]">e.mn</span>
              </h1>
            </Link>
          </div>
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-4">
            <MessagesButton />
            <FavoritesButton />
            <ThemeToggle />
            <AuthModal />
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-3 md:px-4 py-4 md:py-6 pb-24 lg:pb-6">
        <div className="grid lg:grid-cols-3 gap-4 md:gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Image */}
            <div className="relative aspect-video rounded-xl md:rounded-2xl overflow-hidden">
              <img
                src={service.image}
                alt={service.title}
                className="w-full h-full object-cover"
              />
              <span className="absolute top-2 left-2 md:top-4 md:left-4 bg-white/95 dark:bg-black/80 text-foreground px-2 md:px-4 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-medium">
                {service.category}
              </span>
            </div>

            {/* Share & Like Buttons */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Хуваалцах
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`flex-1 sm:flex-none ${isFavorite(service.id) ? "bg-pink-50 border-pink-200 text-pink-600 dark:bg-pink-950/30 dark:border-pink-800" : ""}`}
                onClick={handleSave}
              >
                <Heart className={`h-4 w-4 mr-2 ${isFavorite(service.id) ? "fill-current" : ""}`} />
                {isFavorite(service.id) ? "Хадгалсан" : "Хадгалах"}
              </Button>
            </div>

            {/* Title & Price */}
            <div>
              <h1 className="text-xl md:text-2xl font-bold mb-1 md:mb-2">{service.title}</h1>
              <p className="text-2xl md:text-3xl font-bold text-primary">{service.price}</p>
            </div>

            {/* Location */}
            <div className="flex items-center gap-2 text-muted-foreground text-sm md:text-base">
              <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span>{service.city}</span>
            </div>

            {/* Mobile Provider Card - Shows on mobile only */}
            <div className="lg:hidden border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={service.provider.avatar}
                    alt={service.provider.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  {service.provider.verified && (
                    <div className="absolute -bottom-0.5 -right-0.5 bg-blue-500 rounded-full p-0.5">
                      <CheckCircle className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{service.provider.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>{service.provider.rating}</span>
                    <span>•</span>
                    <span>{service.provider.reviews} сэтгэгдэл</span>
                  </div>
                </div>
              </div>

              {/* Mobile Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400 text-sm">
                    <ThumbsUp className="h-3 w-3" />
                    <span className="font-bold">{service.provider.successfulServices}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Амжилттай</p>
                </div>
                <div className="text-center p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-red-600 dark:text-red-400 text-sm">
                    <ThumbsDown className="h-3 w-3" />
                    <span className="font-bold">{service.provider.failedServices}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Амжилтгүй</p>
                </div>
                <div className="text-center p-2 bg-pink-50 dark:bg-pink-950/30 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-pink-600 dark:text-pink-400 text-sm">
                    <Heart className="h-3 w-3 fill-current" />
                    <span className="font-bold">{service.provider.likes}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Лайк</p>
                </div>
              </div>

              {/* View Profile Button */}
              <Link href={`/account/${encodeURIComponent(service.provider.name.replace(/\s+/g, '-').toLowerCase())}`}>
                <Button variant="outline" className="w-full" size="sm">
                  <UserCircle className="h-4 w-4 mr-2" />
                  Профиль харах
                </Button>
              </Link>
            </div>

            {/* Description */}
            <div className="space-y-2 md:space-y-3">
              <h2 className="text-base md:text-lg font-semibold">Дэлгэрэнгүй</h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                {service.fullDescription}
              </p>
            </div>

            {/* Features */}
            <div className="space-y-2 md:space-y-3">
              <h2 className="text-base md:text-lg font-semibold">Онцлог</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                {service.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 p-2.5 md:p-3 bg-muted/50 rounded-lg">
                    <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-500 shrink-0" />
                    <span className="text-xs md:text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Reviews - Shows on mobile only */}
            <div className="lg:hidden space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Сэтгэгдэл ({service.reviews.length})
                </h2>
                {service.reviews.length > 0 && (
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">
                      {(service.reviews.reduce((acc, r) => acc + r.rating, 0) / service.reviews.length).toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
              {service.reviews.length > 0 ? (
                <div className="space-y-3">
                  {service.reviews.map((review) => (
                    <div key={review.id} className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={review.avatar}
                          alt={review.author}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <span className="font-medium text-sm">{review.author}</span>
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${
                                  i < review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted-foreground/30"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{review.date}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {review.comment}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-muted/30 rounded-lg">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Одоогоор сэтгэгдэл байхгүй байна</p>
                </div>
              )}
            </div>

          </div>

          {/* Right Column - Provider Info (Desktop only) */}
          <div className="hidden lg:block space-y-4">
            {/* Provider Card */}
            <div className="border rounded-2xl p-6 space-y-4 sticky top-24">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={service.provider.avatar}
                    alt={service.provider.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  {service.provider.verified && (
                    <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">{service.provider.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{service.provider.rating}</span>
                    <span>•</span>
                    <span>{service.provider.reviews} сэтгэгдэл</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{service.provider.memberSince} оноос хойш гишүүн</span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400">
                    <ThumbsUp className="h-4 w-4" />
                    <span className="font-bold">{service.provider.successfulServices}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Амжилттай</p>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-red-600 dark:text-red-400">
                    <ThumbsDown className="h-4 w-4" />
                    <span className="font-bold">{service.provider.failedServices}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Амжилтгүй</p>
                </div>
                <div className="text-center p-3 bg-pink-50 dark:bg-pink-950/30 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-pink-600 dark:text-pink-400">
                    <Heart className="h-4 w-4 fill-current" />
                    <span className="font-bold">{service.provider.likes}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Лайк</p>
                </div>
              </div>

              {/* Success Rate */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Амжилтын хувь</span>
                  <span className="font-semibold text-green-600">
                    {Math.round((service.provider.successfulServices / (service.provider.successfulServices + service.provider.failedServices)) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{
                      width: `${(service.provider.successfulServices / (service.provider.successfulServices + service.provider.failedServices)) * 100}%`
                    }}
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {requestPending ? (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg space-y-3">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                      <Hourglass className="h-5 w-5 animate-pulse" />
                      <span className="font-medium">Хүсэлт илгээгдсэн</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Та {service.provider.name}-д хүсэлт илгээсэн байна. Баталгаажуулалт болон харилцаа эхлэхийг хүлээнэ үү.
                    </p>
                    <div className="flex items-center justify-center gap-2 p-3 bg-background rounded-lg">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-lg font-bold">{timeRemaining || "02:00:00"}</span>
                    </div>
                    <p className="text-xs text-center text-muted-foreground">
                      Хугацаа дуусахад дахин хүсэлт илгээх боломжтой
                    </p>
                  </div>
                ) : (
                  <Button className="w-full" size="lg" onClick={handleServiceRequest}>
                    Үйлчилгээ авах
                  </Button>
                )}
                <Link href={`/account/${encodeURIComponent(service.provider.name.replace(/\s+/g, '-').toLowerCase())}`}>
                  <Button variant="ghost" className="w-full" size="lg">
                    <UserCircle className="h-4 w-4 mr-2" />
                    Профиль харах
                  </Button>
                </Link>
              </div>

              {/* Reviews in Sidebar */}
              <div className="border-t pt-4 mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Сэтгэгдэл ({service.reviews.length})
                  </h3>
                  {service.reviews.length > 0 && (
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium text-xs">
                        {(service.reviews.reduce((acc, r) => acc + r.rating, 0) / service.reviews.length).toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
                {service.reviews.length > 0 ? (
                  <div className="space-y-2 max-h-[480px] overflow-y-auto">
                    {service.reviews.map((review) => (
                      <div key={review.id} className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <img
                            src={review.avatar}
                            alt={review.author}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <span className="font-medium text-xs truncate flex-1">{review.author}</span>
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-2.5 w-2.5 ${
                                  i < review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted-foreground/30"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {review.comment}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-muted/30 rounded-lg">
                    <MessageSquare className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground">Одоогоор сэтгэгдэл байхгүй байна</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Fixed Bottom Bar - Above bottom nav */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 bg-background border-t p-3 z-40">
        {requestPending ? (
          <div className="flex items-center justify-between gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Hourglass className="h-4 w-4 animate-pulse" />
              <span className="text-sm font-medium">Хүсэлт илгээгдсэн</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono font-bold">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{timeRemaining || "02:00:00"}</span>
            </div>
          </div>
        ) : (
          <Button className="w-full" size="default" onClick={handleServiceRequest}>
            Үйлчилгээ авах
          </Button>
        )}
      </div>

      {/* Service Request Modal */}
      <ServiceRequestModal
        open={requestModalOpen}
        onOpenChange={setRequestModalOpen}
        provider={service.provider}
        serviceTitle={service.title}
        onRequestSent={handleRequestSent}
      />

      {/* Login Prompt Modal */}
      <LoginPromptModal
        open={showLoginPrompt}
        onOpenChange={setShowLoginPrompt}
        onSuccess={() => setRequestModalOpen(true)}
      />
    </div>
  );
}
