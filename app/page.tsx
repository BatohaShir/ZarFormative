import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { CategoriesModal } from "@/components/categories-modal";
import { AuthModal } from "@/components/auth-modal";
import { allCategories } from "@/lib/categories";
import { ServiceCard } from "@/components/service-card";
import { FavoritesButton } from "@/components/favorites-button";
import { RequestsButton } from "@/components/requests-button";
import { SearchInput } from "@/components/search-input";
import { CitySelect } from "@/components/city-select";
import { Footer } from "@/components/footer";
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
    <div className="min-h-screen bg-background pb-20 md:pb-0">
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
            <RequestsButton />
            <FavoritesButton />
            <ThemeToggle />
            <AuthModal />
          </nav>
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

      {/* Footer - Desktop only */}
      <div className="hidden md:block">
        <Footer />
      </div>

      {/* Create Service FAB - Desktop only */}
      <Link href="/services/create" className="hidden md:flex fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 group">
        <div className="relative">
          {/* Tooltip - Desktop only */}
          <div className="hidden md:block absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-foreground text-background text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
            Үйлчилгээ нэмэх
            <div className="absolute top-full right-4 border-4 border-transparent border-t-foreground" />
          </div>
          {/* Button - Smaller on mobile */}
          <Button
            size="lg"
            className="h-12 md:h-14 px-3 md:pl-4 md:pr-5 rounded-full shadow-lg hover:shadow-xl transition-all bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 gap-1.5 md:gap-2"
          >
            <Plus className="h-4 w-4 md:h-5 md:w-5" />
            <span className="font-medium text-sm md:text-base">Зарлах</span>
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
