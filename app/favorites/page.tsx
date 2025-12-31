"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthModal } from "@/components/auth-modal";
import { FavoritesButton } from "@/components/favorites-button";
import { MessagesButton } from "@/components/messages-button";
import { ServiceCard } from "@/components/service-card";
import { ChevronLeft, Heart } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useFavorites } from "@/contexts/favorites-context";
import { LoginPromptModal } from "@/components/login-prompt-modal";

const allServices = [
  {
    id: 1,
    title: "Орон сууцны засвар",
    description: "Мэргэжлийн баг, чанартай ажил",
    price: "50,000₮-с",
    category: "Засвар",
    city: "Улаанбаатар",
    provider: "Болд Констракшн",
    providerAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    rating: 4.8,
    likes: 892,
    successful: 245,
    failed: 3,
    image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=300&h=300&fit=crop",
  },
  {
    id: 2,
    title: "Гэрийн цэвэрлэгээ",
    description: "Өдөр бүр, долоо хоног бүр",
    price: "30,000₮-с",
    category: "Цэвэрлэгээ",
    city: "Улаанбаатар",
    provider: "Цэвэр Гэр ХХК",
    providerAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    rating: 4.9,
    likes: 654,
    successful: 178,
    failed: 2,
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&h=300&fit=crop",
  },
  {
    id: 3,
    title: "Компьютер засвар",
    description: "Бүх төрлийн техник засвар",
    price: "20,000₮-с",
    category: "Техник",
    city: "Дархан",
    provider: "ТехМастер",
    providerAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    rating: 4.7,
    likes: 1203,
    successful: 412,
    failed: 8,
    image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=300&h=300&fit=crop",
  },
  {
    id: 4,
    title: "Англи хэлний хичээл",
    description: "Туршлагатай багш, онлайн/офлайн",
    price: "40,000₮/цаг",
    category: "Сургалт",
    city: "Улаанбаатар",
    provider: "Сараа багш",
    providerAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    rating: 5.0,
    likes: 1567,
    successful: 320,
    failed: 0,
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=300&h=300&fit=crop",
  },
  {
    id: 5,
    title: "Ачаа тээвэр",
    description: "Хот доторх болон хот хоорондын",
    price: "80,000₮-с",
    category: "Тээвэр",
    city: "Улаанбаатар",
    provider: "Хурд Логистик",
    providerAvatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop",
    rating: 4.6,
    likes: 2341,
    successful: 856,
    failed: 12,
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=300&h=300&fit=crop",
  },
  {
    id: 6,
    title: "Гоо сайхны үйлчилгээ",
    description: "Үс засалт, гоо сайхан",
    price: "15,000₮-с",
    category: "Гоо сайхан",
    city: "Эрдэнэт",
    provider: "Гоо Студио",
    providerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
    rating: 4.9,
    likes: 1876,
    successful: 534,
    failed: 4,
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&h=300&fit=crop",
  },
  {
    id: 7,
    title: "Веб хөгжүүлэлт",
    description: "Вебсайт, апп хөгжүүлэлт",
    price: "500,000₮-с",
    category: "IT",
    city: "Улаанбаатар",
    provider: "КодМастер ХХК",
    providerAvatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop",
    rating: 4.8,
    likes: 456,
    successful: 89,
    failed: 2,
    image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=300&h=300&fit=crop",
  },
  {
    id: 8,
    title: "Авто засвар",
    description: "Бүх төрлийн авто засвар",
    price: "30,000₮-с",
    category: "Авто",
    city: "Улаанбаатар",
    provider: "АвтоПро Сервис",
    providerAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop",
    rating: 4.7,
    likes: 1432,
    successful: 623,
    failed: 9,
    image: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=300&h=300&fit=crop",
  },
  {
    id: 9,
    title: "Цахилгааны ажил",
    description: "Цахилгаан угсралт, засвар",
    price: "25,000₮-с",
    category: "Засвар",
    city: "Улаанбаатар",
    provider: "Электрик Про",
    providerAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    rating: 4.6,
    likes: 678,
    successful: 234,
    failed: 5,
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300&h=300&fit=crop",
  },
  {
    id: 10,
    title: "Сантехникийн ажил",
    description: "Ус, дулааны шугам засвар",
    price: "35,000₮-с",
    category: "Засвар",
    city: "Улаанбаатар",
    provider: "Усны Мастер",
    providerAvatar: "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=100&h=100&fit=crop",
    rating: 4.5,
    likes: 543,
    successful: 189,
    failed: 7,
    image: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=300&h=300&fit=crop",
  },
  {
    id: 11,
    title: "Гэрийн тавилга угсралт",
    description: "Тавилга угсрах, задлах",
    price: "20,000₮-с",
    category: "Засвар",
    city: "Улаанбаатар",
    provider: "Тавилга Мастер",
    providerAvatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop",
    rating: 4.8,
    likes: 432,
    successful: 156,
    failed: 2,
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&h=300&fit=crop",
  },
  {
    id: 12,
    title: "Зураг авалт",
    description: "Мэргэжлийн гэрэл зураг",
    price: "100,000₮-с",
    category: "Урлаг",
    city: "Улаанбаатар",
    provider: "Фото Студио",
    providerAvatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop",
    rating: 4.9,
    likes: 987,
    successful: 345,
    failed: 1,
    image: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=300&h=300&fit=crop",
  },
];

export default function FavoritesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { favorites } = useFavorites();
  const [showLoginModal, setShowLoginModal] = React.useState(false);

  React.useEffect(() => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
    }
  }, [isAuthenticated]);

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
  };

  const handleLoginModalClose = (open: boolean) => {
    if (!open && !isAuthenticated) {
      router.push("/");
    } else {
      setShowLoginModal(open);
    }
  };

  const favoriteServices = allServices.filter((service) =>
    favorites.includes(service.id)
  );

  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Нэвтэрнэ үү</h2>
            <p className="text-muted-foreground mb-4">
              Дуртай үйлчилгээнүүдээ харахын тулд нэвтэрнэ үү
            </p>
          </div>
        </div>
        <LoginPromptModal
          open={showLoginModal}
          onOpenChange={handleLoginModalClose}
          onSuccess={handleLoginSuccess}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10">
                <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </Link>
            <Link href="/">
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

      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Page Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
            <Heart className="h-5 w-5 md:h-6 md:w-6 text-pink-500 fill-pink-500" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Дуртай үйлчилгээ</h2>
            <p className="text-sm text-muted-foreground">
              {favoriteServices.length} үйлчилгээ
            </p>
          </div>
        </div>

        {/* Favorites Grid */}
        {favoriteServices.length > 0 ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
            {favoriteServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Дуртай үйлчилгээ байхгүй байна</h3>
            <p className="text-muted-foreground mb-6">
              Та дуртай үйлчилгээгээ ❤️ дарж хадгалаарай
            </p>
            <Link href="/services">
              <Button>Үйлчилгээ үзэх</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
