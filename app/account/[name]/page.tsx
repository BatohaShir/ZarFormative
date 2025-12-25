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
import {
  ChevronLeft,
  MapPin,
  Star,
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  Heart,
  Briefcase,
  GraduationCap,
  Clock,
} from "lucide-react";

// Mock provider data
const providers: Record<string, {
  id: number;
  name: string;
  avatar: string;
  rating: number;
  reviews: number;
  memberSince: string;
  verified: boolean;
  successfulServices: number;
  failedServices: number;
  likes: number;
  location: string;
  bio: string;
  workExperience: {
    id: number;
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    description: string;
  }[];
  education: {
    id: number;
    school: string;
    degree: string;
    startDate: string;
    endDate: string;
  }[];
  services: {
    id: number;
    title: string;
    price: string;
    image: string;
    category: string;
  }[];
}> = {
  "болд-констракшн": {
    id: 1,
    name: "Болд Констракшн",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    rating: 4.8,
    reviews: 127,
    memberSince: "2021",
    verified: true,
    successfulServices: 245,
    failedServices: 3,
    likes: 892,
    location: "Улаанбаатар",
    bio: "Бид 10 жилийн туршлагатай мэргэжлийн засварын баг юм. Орон сууц, оффис, арилжааны барилгын засвар үйлчилгээг чанартай, хурдан гүйцэтгэнэ.",
    workExperience: [
      {
        id: 1,
        company: "Болд Констракшн ХХК",
        position: "Үүсгэн байгуулагч, Захирал",
        startDate: "2021",
        endDate: "Одоо",
        description: "Компанийг үүсгэн байгуулж, өдөр тутмын үйл ажиллагааг удирдаж байна.",
      },
      {
        id: 2,
        company: "Монголын Барилга ХХК",
        position: "Ахлах барилгачин",
        startDate: "2015",
        endDate: "2021",
        description: "Барилгын засвар, шинэчлэлтийн ажлуудыг хариуцан ажилласан.",
      },
    ],
    education: [
      {
        id: 1,
        school: "ШУТИС",
        degree: "Барилгын инженер, Бакалавр",
        startDate: "2011",
        endDate: "2015",
      },
    ],
    services: [
      {
        id: 1,
        title: "Орон сууцны засвар",
        price: "50,000₮-с",
        image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&h=600&fit=crop",
        category: "Засвар",
      },
    ],
  },
  "цэвэр-гэр": {
    id: 2,
    name: "Цэвэр Гэр",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    rating: 4.9,
    reviews: 89,
    memberSince: "2022",
    verified: true,
    successfulServices: 178,
    failedServices: 2,
    likes: 654,
    location: "Улаанбаатар",
    bio: "Гэр, оффисын цэвэрлэгээний мэргэжлийн үйлчилгээ. Экологийн цэвэр бодис ашиглан таны орчныг эрүүл, цэвэр байлгана.",
    workExperience: [
      {
        id: 1,
        company: "Цэвэр Гэр ХХК",
        position: "Үүсгэн байгуулагч",
        startDate: "2022",
        endDate: "Одоо",
        description: "Цэвэрлэгээний үйлчилгээний компани эхлүүлсэн.",
      },
    ],
    education: [],
    services: [
      {
        id: 2,
        title: "Гэрийн цэвэрлэгээ",
        price: "30,000₮-с",
        image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=600&fit=crop",
        category: "Цэвэрлэгээ",
      },
    ],
  },
  "техмастер": {
    id: 3,
    name: "ТехМастер",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    rating: 4.7,
    reviews: 203,
    memberSince: "2020",
    verified: true,
    successfulServices: 412,
    failedServices: 8,
    likes: 1203,
    location: "Дархан",
    bio: "Компьютер, зөөврийн компьютер, гар утас, таблет зэрэг бүх төрлийн электрон төхөөрөмжийн засвар үйлчилгээ. Мэргэжлийн түвшинд хурдан, найдвартай.",
    workExperience: [
      {
        id: 1,
        company: "ТехМастер",
        position: "Техникийн мэргэжилтэн",
        startDate: "2020",
        endDate: "Одоо",
        description: "Компьютер засварын үйлчилгээ үзүүлж байна.",
      },
      {
        id: 2,
        company: "Ай Ти Зон ХХК",
        position: "Системийн администратор",
        startDate: "2017",
        endDate: "2020",
        description: "Байгууллагын компьютерийн системийг хариуцан ажилласан.",
      },
    ],
    education: [
      {
        id: 1,
        school: "МУИС",
        degree: "Мэдээллийн технологи, Бакалавр",
        startDate: "2013",
        endDate: "2017",
      },
    ],
    services: [
      {
        id: 3,
        title: "Компьютер засвар",
        price: "20,000₮-с",
        image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&h=600&fit=crop",
        category: "Техник",
      },
    ],
  },
  "сараа-багш": {
    id: 4,
    name: "Сараа багш",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    rating: 5.0,
    reviews: 156,
    memberSince: "2019",
    verified: true,
    successfulServices: 320,
    failedServices: 0,
    likes: 1567,
    location: "Улаанбаатар",
    bio: "8 жилийн туршлагатай англи хэлний багш. IELTS, TOEFL бэлтгэл, ярианы англи хэл, бизнесийн англи хэл зэрэг бүх түвшний сургалт явуулна.",
    workExperience: [
      {
        id: 1,
        company: "Хувиараа",
        position: "Англи хэлний багш",
        startDate: "2019",
        endDate: "Одоо",
        description: "Хувийн сургалт, онлайн хичээл заадаг.",
      },
      {
        id: 2,
        company: "English First Center",
        position: "Ахлах багш",
        startDate: "2016",
        endDate: "2019",
        description: "IELTS бэлтгэлийн ангийн багш.",
      },
    ],
    education: [
      {
        id: 1,
        school: "University of Melbourne",
        degree: "TESOL, Магистр",
        startDate: "2014",
        endDate: "2016",
      },
      {
        id: 2,
        school: "МУИС",
        degree: "Англи хэл, Бакалавр",
        startDate: "2010",
        endDate: "2014",
      },
    ],
    services: [
      {
        id: 4,
        title: "Англи хэлний хичээл",
        price: "40,000₮/цаг",
        image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=600&fit=crop",
        category: "Сургалт",
      },
    ],
  },
  "хурд-логистик": {
    id: 5,
    name: "Хурд Логистик",
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop",
    rating: 4.6,
    reviews: 312,
    memberSince: "2018",
    verified: true,
    successfulServices: 856,
    failedServices: 12,
    likes: 2341,
    location: "Улаанбаатар",
    bio: "Бүх төрлийн ачаа тээвэр, нүүлгэлтийн үйлчилгээ. Хот дотор болон хот хоорондын тээвэр. Найдвартай, хурдан үйлчилгээ.",
    workExperience: [],
    education: [],
    services: [
      {
        id: 5,
        title: "Ачаа тээвэр",
        price: "80,000₮-с",
        image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=600&fit=crop",
        category: "Тээвэр",
      },
    ],
  },
  "гоо-студио": {
    id: 6,
    name: "Гоо Студио",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
    rating: 4.9,
    reviews: 245,
    memberSince: "2020",
    verified: true,
    successfulServices: 534,
    failedServices: 4,
    likes: 1876,
    location: "Эрдэнэт",
    bio: "Гоо сайхны бүх төрлийн үйлчилгээг мэргэжлийн түвшинд үзүүлнэ. Үс засалт, будалт, маникюр, педикюр, хуримын будалт.",
    workExperience: [],
    education: [],
    services: [
      {
        id: 6,
        title: "Гоо сайхны үйлчилгээ",
        price: "15,000₮-с",
        image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=600&fit=crop",
        category: "Гоо сайхан",
      },
    ],
  },
  "кодмастер": {
    id: 7,
    name: "КодМастер",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop",
    rating: 4.8,
    reviews: 67,
    memberSince: "2021",
    verified: true,
    successfulServices: 89,
    failedServices: 2,
    likes: 456,
    location: "Улаанбаатар",
    bio: "Вебсайт, гар утасны апп, онлайн дэлгүүр зэрэг бүх төрлийн програм хангамжийн хөгжүүлэлт. React, Next.js, React Native технологи ашиглана.",
    workExperience: [
      {
        id: 1,
        company: "КодМастер ХХК",
        position: "Үүсгэн байгуулагч, Full-stack хөгжүүлэгч",
        startDate: "2021",
        endDate: "Одоо",
        description: "Вебсайт, апп хөгжүүлэлтийн үйлчилгээ үзүүлдэг.",
      },
    ],
    education: [
      {
        id: 1,
        school: "ШУТИС",
        degree: "Программ хангамж, Бакалавр",
        startDate: "2015",
        endDate: "2019",
      },
    ],
    services: [
      {
        id: 7,
        title: "Веб хөгжүүлэлт",
        price: "500,000₮-с",
        image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=600&fit=crop",
        category: "IT",
      },
    ],
  },
  "автопро-сервис": {
    id: 8,
    name: "АвтоПро Сервис",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop",
    rating: 4.7,
    reviews: 189,
    memberSince: "2019",
    verified: true,
    successfulServices: 623,
    failedServices: 9,
    likes: 1432,
    location: "Улаанбаатар",
    bio: "Бүх төрлийн автомашины засвар үйлчилгээ. Хөдөлгүүр, хурдны хайрцаг, тоормос, цахилгаан систем зэрэг бүх төрлийн засварыг мэргэжлийн түвшинд.",
    workExperience: [],
    education: [],
    services: [
      {
        id: 8,
        title: "Авто засвар",
        price: "30,000₮-с",
        image: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=800&h=600&fit=crop",
        category: "Авто",
      },
    ],
  },
};

export default function AccountPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const router = useRouter();

  const decodedName = decodeURIComponent(name);
  const provider = providers[decodedName];

  if (!provider) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl md:text-2xl font-bold mb-4">Профайл олдсонгүй</h1>
          <Link href="/">
            <Button>Нүүр хуудас руу буцах</Button>
          </Link>
        </div>
      </div>
    );
  }

  const successRate = Math.round(
    (provider.successfulServices / (provider.successfulServices + provider.failedServices)) * 100
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-2 md:px-4 py-2 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-1 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 md:h-10 md:w-10"
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
          {/* Mobile Nav */}
          <div className="flex items-center gap-1 md:hidden">
            <MessagesButton className="h-8 w-8" />
            <FavoritesButton className="h-8 w-8" />
            <ThemeToggle />
            <AuthModal />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-2 md:px-4 py-2 md:py-6 pb-4">
        <div className="max-w-4xl mx-auto space-y-2 md:space-y-6">
          {/* Profile Header */}
          <div className="border rounded-lg md:rounded-2xl p-2.5 md:p-6 space-y-2 md:space-y-4">
            <div className="flex items-center gap-2.5 md:gap-4">
              <div className="relative shrink-0">
                <img
                  src={provider.avatar}
                  alt={provider.name}
                  className="w-14 h-14 md:w-32 md:h-32 rounded-full object-cover"
                />
                {provider.verified && (
                  <div className="absolute -bottom-0.5 -right-0.5 md:bottom-1 md:right-1 bg-blue-500 rounded-full p-0.5 md:p-1.5">
                    <CheckCircle className="h-2.5 w-2.5 md:h-4 md:w-4 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-sm md:text-2xl font-bold truncate">{provider.name}</h1>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] md:text-sm text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 md:h-4 md:w-4" />
                    {provider.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 md:h-4 md:w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium text-foreground">{provider.rating}</span>
                    <span>({provider.reviews})</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 md:h-4 md:w-4" />
                    {provider.memberSince} оноос
                  </span>
                </div>
              </div>
            </div>

            {/* Bio */}
            <p className="text-[11px] md:text-base text-muted-foreground line-clamp-2 md:line-clamp-none">{provider.bio}</p>

            {/* Stats - more compact on mobile */}
            <div className="flex items-center justify-between gap-1 md:grid md:grid-cols-3 md:gap-4">
              <div className="flex-1 text-center py-1.5 px-1 md:p-3 bg-green-50 dark:bg-green-950/30 rounded-md md:rounded-lg">
                <div className="flex items-center justify-center gap-0.5 text-green-600 dark:text-green-400">
                  <ThumbsUp className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="font-bold text-xs md:text-lg">{provider.successfulServices}</span>
                </div>
                <p className="text-[9px] md:text-xs text-muted-foreground">Амжилттай</p>
              </div>
              <div className="flex-1 text-center py-1.5 px-1 md:p-3 bg-red-50 dark:bg-red-950/30 rounded-md md:rounded-lg">
                <div className="flex items-center justify-center gap-0.5 text-red-600 dark:text-red-400">
                  <ThumbsDown className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="font-bold text-xs md:text-lg">{provider.failedServices}</span>
                </div>
                <p className="text-[9px] md:text-xs text-muted-foreground">Амжилтгүй</p>
              </div>
              <div className="flex-1 text-center py-1.5 px-1 md:p-3 bg-pink-50 dark:bg-pink-950/30 rounded-md md:rounded-lg">
                <div className="flex items-center justify-center gap-0.5 text-pink-600 dark:text-pink-400">
                  <Heart className="h-3 w-3 md:h-4 md:w-4 fill-current" />
                  <span className="font-bold text-xs md:text-lg">{provider.likes}</span>
                </div>
                <p className="text-[9px] md:text-xs text-muted-foreground">Лайк</p>
              </div>
            </div>

            {/* Success Rate - inline on mobile */}
            <div className="flex items-center gap-2 md:block">
              <span className="text-[10px] md:text-sm text-muted-foreground whitespace-nowrap">Амжилт:</span>
              <div className="flex-1 h-1.5 md:h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${successRate}%` }}
                />
              </div>
              <span className="text-[10px] md:text-sm font-semibold text-green-600">{successRate}%</span>
            </div>
          </div>

          {/* Education & Work Experience - side by side on mobile if both exist */}
          {(provider.education.length > 0 || provider.workExperience.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-6">
              {/* Education */}
              {provider.education.length > 0 && (
                <div className="border rounded-lg md:rounded-2xl p-2 md:p-6 space-y-1.5 md:space-y-4">
                  <h2 className="text-xs md:text-lg font-semibold flex items-center gap-1 md:gap-2">
                    <GraduationCap className="h-3.5 w-3.5 md:h-5 md:w-5" />
                    Боловсрол
                  </h2>
                  <div className="space-y-1.5 md:space-y-4">
                    {provider.education.map((edu) => (
                      <div key={edu.id} className="flex gap-1.5 md:gap-4">
                        <div className="hidden md:flex w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/50 items-center justify-center shrink-0">
                          <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium text-[11px] md:text-base truncate">{edu.school}</h3>
                          <p className="text-[10px] md:text-sm text-muted-foreground truncate">{edu.degree}</p>
                          <p className="text-[9px] md:text-xs text-muted-foreground">
                            {edu.startDate} - {edu.endDate}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Work Experience */}
              {provider.workExperience.length > 0 && (
                <div className="border rounded-lg md:rounded-2xl p-2 md:p-6 space-y-1.5 md:space-y-4">
                  <h2 className="text-xs md:text-lg font-semibold flex items-center gap-1 md:gap-2">
                    <Briefcase className="h-3.5 w-3.5 md:h-5 md:w-5" />
                    Туршлага
                  </h2>
                  <div className="space-y-1.5 md:space-y-4">
                    {provider.workExperience.slice(0, 2).map((work) => (
                      <div key={work.id} className="flex gap-1.5 md:gap-4">
                        <div className="hidden md:flex w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/50 items-center justify-center shrink-0">
                          <Briefcase className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-[11px] md:text-base truncate">{work.position}</h3>
                          <p className="text-[10px] md:text-sm text-muted-foreground truncate">{work.company}</p>
                          <p className="text-[9px] md:text-xs text-muted-foreground">
                            {work.startDate} - {work.endDate}
                          </p>
                          {work.description && (
                            <p className="hidden md:block text-sm text-muted-foreground mt-1">{work.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {provider.workExperience.length > 2 && (
                      <p className="text-[10px] md:text-xs text-muted-foreground">
                        +{provider.workExperience.length - 2} бусад
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Services */}
          {provider.services.length > 0 && (
            <div className="border rounded-lg md:rounded-2xl p-2 md:p-6 space-y-1.5 md:space-y-4">
              <h2 className="text-xs md:text-lg font-semibold">Үйлчилгээнүүд</h2>
              <div className="grid gap-1.5 md:gap-4">
                {provider.services.map((service) => (
                  <Link key={service.id} href={`/services/${service.id}`}>
                    <div className="flex gap-2 md:gap-4 p-1.5 md:p-3 border rounded-md md:rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
                      <img
                        src={service.image}
                        alt={service.title}
                        className="w-12 h-12 md:w-24 md:h-24 rounded-md md:rounded-lg object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] md:text-xs px-1 md:px-2 py-0.5 bg-muted rounded-full shrink-0">
                            {service.category}
                          </span>
                          <h3 className="font-medium text-[11px] md:text-base truncate">{service.title}</h3>
                        </div>
                        <p className="text-primary font-bold text-xs md:text-base mt-0.5">{service.price}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
