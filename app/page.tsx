import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { CategoriesModal } from "@/components/categories-modal";
import { AuthModal } from "@/components/auth-modal";
import { allCategories } from "@/lib/categories";
import { ServiceCard } from "@/components/service-card";
import { FavoritesButton } from "@/components/favorites-button";
import { MessagesButton } from "@/components/messages-button";
import { SearchInput } from "@/components/search-input";
import { CitySelect } from "@/components/city-select";
import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";

const isImageIcon = (icon: string) => icon.startsWith("/");

const mainCategories = allCategories.slice(0, 10);

const recommendedServices = [
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
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <h1 className="text-lg md:text-2xl font-bold">
            <span className="text-[#c4272f]">Uilc</span>
            <span className="text-[#015197]">hilge</span>
            <span className="text-[#c4272f]">e.mn</span>
          </h1>
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-4">
            <MessagesButton />
            <FavoritesButton />
            <ThemeToggle />
            <AuthModal />
          </nav>
          {/* Mobile Nav */}
          <div className="flex items-center gap-2 md:hidden">
            <MessagesButton className="h-9 w-9" />
            <FavoritesButton className="h-9 w-9" />
            <ThemeToggle />
            <AuthModal />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-8 md:py-12 text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 md:mb-4">Хэрэгтэй үйлчилгээгээ олоорой</h2>
        <p className="text-sm md:text-base text-muted-foreground mb-6 md:mb-8 max-w-md mx-auto">
          Мянга мянган мэргэжилтнүүд танд туслахад бэлэн байна
        </p>
        {/* Desktop Search */}
        <div className="hidden md:flex w-full gap-2">
          <SearchInput services={recommendedServices} className="flex-1" />
          <CitySelect />
        </div>
        {/* Mobile Search */}
        <div className="flex flex-col gap-2 md:hidden">
          <SearchInput services={recommendedServices} />
          <CitySelect />
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-4 md:py-6">
        <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Ангилал</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
          {mainCategories.map((cat) => (
            <Link
              key={cat.id}
              href={`/services?categories=${encodeURIComponent(cat.name)}`}
              className="flex items-center gap-2 md:gap-3 py-3 md:py-5 px-3 md:px-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              {isImageIcon(cat.icon) ? (
                <Image src={cat.icon} alt={cat.name} width={32} height={32} className="w-6 h-6 md:w-10 md:h-10" />
              ) : (
                <span className="text-xl md:text-3xl">{cat.icon}</span>
              )}
              <span className="text-xs md:text-sm font-medium line-clamp-1">{cat.name}</span>
            </Link>
          ))}
          <CategoriesModal
            trigger={
              <button className="col-span-2 sm:col-span-1 lg:col-span-2 flex items-center justify-center gap-2 py-3 md:py-5 px-3 md:px-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <span className="text-xs md:text-sm font-medium">Бүх ангилал</span>
                <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
              </button>
            }
          />
        </div>
      </section>

      {/* Recommendations */}
      <section className="container mx-auto px-4 py-6 md:py-8">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h3 className="text-base md:text-xl font-semibold">Танд зориулсан санал</h3>
          <Link href="/services">
            <Button variant="ghost" size="sm" className="text-muted-foreground text-xs md:text-sm">
              Бүгдийг харах <ChevronRight className="h-3 w-3 md:h-4 md:w-4 ml-1" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
          {recommendedServices.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t mt-6 md:mt-8 bg-muted/30">
        <div className="container mx-auto px-4 py-8 md:py-12">
          {/* Main Footer Content */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-8">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <h2 className="text-lg md:text-xl font-bold mb-3">
                <span className="text-[#c4272f]">Uilc</span>
                <span className="text-[#015197]">hilge</span>
                <span className="text-[#c4272f]">.mn</span>
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Монголын хамгийн том үйлчилгээний платформ. Мянга мянган мэргэжилтнүүд танд туслахад бэлэн.
              </p>
              {/* Social Icons */}
              <div className="flex gap-3">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center text-white hover:opacity-80 transition-opacity"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-[#1877F2] flex items-center justify-center text-white hover:opacity-80 transition-opacity"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-[#FF0000] flex items-center justify-center text-white hover:opacity-80 transition-opacity"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold mb-3 text-sm md:text-base">Түргэн холбоос</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/services" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Үйлчилгээнүүд
                  </Link>
                </li>
                <li>
                  <Link href="/favorites" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Таалагдсан
                  </Link>
                </li>
                <li>
                  <Link href="/messages" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Мессежүүд
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="font-semibold mb-3 text-sm md:text-base">Тусламж</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/help" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Тусламж
                  </Link>
                </li>
                <li>
                  <Link href="/advertising" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Сайтад сурталчлах
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Бидний тухай
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="font-semibold mb-3 text-sm md:text-base">Холбоо барих</h3>
              <ul className="space-y-2">
                <li className="text-sm text-muted-foreground">
                  <span className="block">Утас: +976 9911-1234</span>
                </li>
                <li className="text-sm text-muted-foreground">
                  <span className="block">И-мэйл: info@uilchilgee.mn</span>
                </li>
                <li className="text-sm text-muted-foreground">
                  <span className="block">Хаяг: Улаанбаатар хот</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Copyright */}
              <p className="text-xs md:text-sm text-muted-foreground text-center md:text-left">
                &copy; 2025 Uilchilgee.mn. Бүх эрх хуулиар хамгаалагдсан.
              </p>
              {/* Company Info */}
              <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                <span>Хөгжүүлсэн:</span>
                <a
                  href="https://formative.mn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-foreground hover:text-primary transition-colors"
                >
                  Formative LLC
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Create Service FAB */}
      <Link href="/services/create" className="fixed bottom-6 right-6 z-50 group">
        <div className="relative">
          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-foreground text-background text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
            Үйлчилгээ нэмэх
            <div className="absolute top-full right-4 border-4 border-transparent border-t-foreground" />
          </div>
          {/* Button */}
          <Button
            size="lg"
            className="h-14 pl-4 pr-5 rounded-full shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 gap-2"
          >
            <Plus className="h-5 w-5" />
            <span className="font-medium">Зарлах</span>
          </Button>
          {/* Pulse animation */}
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
          </span>
        </div>
      </Link>
    </div>
  );
}
