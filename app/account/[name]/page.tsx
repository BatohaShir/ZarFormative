"use client";

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthModal } from "@/components/auth-modal";
import { FavoritesButton } from "@/components/favorites-button";
import { RequestsButton } from "@/components/requests-button";
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
  MessageCircle,
  Phone,
  Share2,
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
  phone?: string;
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
    phone: "+976 9911 2233",
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
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:h-10 md:w-10"
              onClick={() => router.back()}
            >
              <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
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
            <RequestsButton />
            <FavoritesButton />
            <ThemeToggle />
            <AuthModal />
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Profile Header - Full Width with Gradient */}
        <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl p-6 md:p-8 mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
            {/* Avatar */}
            <div className="relative">
              <div className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full overflow-hidden ring-4 ring-white dark:ring-gray-800 shadow-xl">
                <img
                  src={provider.avatar}
                  alt={provider.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {provider.verified && (
                <div className="absolute bottom-2 right-2 bg-blue-500 rounded-full p-1.5 md:p-2 ring-2 ring-white dark:ring-gray-800">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-white" />
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2">
                {provider.name}
              </h2>
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {provider.location}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold text-foreground">{provider.rating}</span>
                  <span>({provider.reviews} сэтгэгдэл)</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {provider.memberSince} оноос
                </span>
              </div>

              {/* Stats - Horizontal Pills */}
              <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 rounded-full">
                  <Star className="h-5 w-5 text-yellow-500 fill-current" />
                  <span className="font-bold text-lg">{provider.rating}</span>
                  <span className="text-sm text-muted-foreground">Үнэлгээ</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 rounded-full">
                  <ThumbsUp className="h-5 w-5 text-green-500" />
                  <span className="font-bold text-lg">{provider.successfulServices}</span>
                  <span className="text-sm text-muted-foreground">Амжилттай</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 rounded-full">
                  <Heart className="h-5 w-5 text-pink-500 fill-current" />
                  <span className="font-bold text-lg">{provider.likes}</span>
                  <span className="text-sm text-muted-foreground">Лайк</span>
                </div>
              </div>
            </div>

            {/* Action Buttons - Desktop */}
            <div className="hidden lg:flex flex-col gap-2">
              <Button className="gap-2">
                <MessageCircle className="h-4 w-4" />
                Мессеж бичих
              </Button>
              <Button variant="outline" className="gap-2">
                <Phone className="h-4 w-4" />
                Залгах
              </Button>
              <Button variant="outline" className="gap-2">
                <Share2 className="h-4 w-4" />
                Хуваалцах
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Left Column - About & Contact */}
          <div className="lg:col-span-1 space-y-6">
            {/* About Card */}
            <div className="bg-card rounded-xl border p-4 md:p-6">
              <h3 className="font-semibold text-lg mb-4">Тухай</h3>
              <p className="text-muted-foreground leading-relaxed">{provider.bio}</p>
            </div>

            {/* Stats Card */}
            <div className="bg-card rounded-xl border p-4 md:p-6">
              <h3 className="font-semibold text-lg mb-4">Статистик</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Амжилттай үйлчилгээ</span>
                  <span className="font-semibold text-green-600">{provider.successfulServices}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Амжилтгүй</span>
                  <span className="font-semibold text-red-600">{provider.failedServices}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Амжилтын хувь</span>
                  <span className="font-semibold text-green-600">{successRate}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${successRate}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Mobile Action Buttons */}
            <div className="lg:hidden space-y-2">
              <Button className="w-full gap-2">
                <MessageCircle className="h-4 w-4" />
                Мессеж бичих
              </Button>
              <Button variant="outline" className="w-full gap-2">
                <Phone className="h-4 w-4" />
                Залгах
              </Button>
              <Button variant="outline" className="w-full gap-2">
                <Share2 className="h-4 w-4" />
                Хуваалцах
              </Button>
            </div>
          </div>

          {/* Right Column - Education, Work & Services */}
          <div className="lg:col-span-2 space-y-6">
            {/* Education */}
            {provider.education.length > 0 && (
              <div className="bg-card rounded-xl border p-4 md:p-6">
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Боловсрол
                </h3>
                <div className="grid gap-3">
                  {provider.education.map((edu) => (
                    <div
                      key={edu.id}
                      className="p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <p className="font-medium">{edu.degree}</p>
                      <p className="text-sm text-muted-foreground">{edu.school}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {edu.startDate} - {edu.endDate}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Work Experience */}
            {provider.workExperience.length > 0 && (
              <div className="bg-card rounded-xl border p-4 md:p-6">
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Ажлын туршлага
                </h3>
                <div className="grid gap-3">
                  {provider.workExperience.map((work) => (
                    <div
                      key={work.id}
                      className="p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <p className="font-medium">{work.position}</p>
                      <p className="text-sm text-muted-foreground">{work.company}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {work.startDate} - {work.endDate}
                      </p>
                      {work.description && (
                        <p className="text-sm text-muted-foreground mt-2">{work.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Services */}
            {provider.services.length > 0 && (
              <div className="bg-card rounded-xl border p-4 md:p-6">
                <h3 className="font-semibold text-lg mb-4">Үйлчилгээнүүд</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {provider.services.map((service) => (
                    <Link key={service.id} href={`/services/${service.id}`}>
                      <div className="group border rounded-xl overflow-hidden hover:shadow-lg transition-all cursor-pointer">
                        <div className="aspect-video overflow-hidden">
                          <img
                            src={service.image}
                            alt={service.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="p-4">
                          <span className="text-xs px-2 py-1 bg-muted rounded-full">
                            {service.category}
                          </span>
                          <h4 className="font-medium mt-2">{service.title}</h4>
                          <p className="text-primary font-bold text-lg mt-1">{service.price}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews Placeholder */}
            <div className="bg-card rounded-xl border p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Сэтгэгдэлүүд
                </h3>
                <span className="text-sm text-muted-foreground">{provider.reviews} сэтгэгдэл</span>
              </div>
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Сэтгэгдэл удахгүй нэмэгдэнэ</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
          <p>Uilchilgee.mn v1.0.0</p>
          <p className="mt-1">© 2024 Бүх эрх хуулиар хамгаалагдсан</p>
        </div>
      </div>
    </div>
  );
}
