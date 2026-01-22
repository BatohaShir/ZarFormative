"use client";

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthModal } from "@/components/auth-modal";
import { FavoritesButton } from "@/components/favorites-button";
import { RequestsButton } from "@/components/requests-button";
import { NotificationsButton } from "@/components/notifications-button";
import { useFindUniqueprofiles } from "@/lib/hooks/profiles";
import { useFindManylistings } from "@/lib/hooks/listings";
import { useFindManylisting_requests, useFindManyreviews } from "@/lib/hooks";
import {
  ChevronLeft,
  MapPin,
  Star,
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  Heart,
  Clock,
  MessageCircle,
  Share2,
  Loader2,
} from "lucide-react";

export default function AccountPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const router = useRouter();

  // name can be either a UUID (id) or a slug-like name
  // Try to load profile by id first, then by slug
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name);

  // Загружаем профиль с оптимизированным кэшированием
  const { data: profile, isLoading: isLoadingProfile } = useFindUniqueprofiles(
    {
      where: isUUID ? { id: name } : { id: name },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        company_name: true,
        is_company: true,
        avatar_url: true,
        about: true,
        phone_number: true,
        created_at: true,
        role: true,
      },
    },
    {
      staleTime: 10 * 60 * 1000, // 10 минут
      gcTime: 30 * 60 * 1000, // 30 минут
    }
  );

  // Загружаем listings параллельно с профилем (используем name как user_id если это UUID)
  // Это устраняет каскадную загрузку (waterfall)
  const { data: listings, isLoading: isLoadingListings } = useFindManylistings(
    {
      where: {
        user_id: isUUID ? name : undefined,
        is_active: true,
        status: "active",
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: {
          where: { is_cover: true },
          select: { id: true, url: true, alt: true },
          take: 1,
        },
        aimag: { select: { name: true } },
      },
      orderBy: { created_at: "desc" },
    },
    {
      enabled: isUUID, // Загружаем только если это UUID
      staleTime: 5 * 60 * 1000, // 5 минут
      gcTime: 15 * 60 * 1000, // 15 минут
    }
  );

  // Fetch requests for stats (as provider)
  const { data: providerRequests } = useFindManylisting_requests(
    {
      where: {
        provider_id: isUUID ? name : undefined,
      },
      select: {
        id: true,
        status: true,
        preferred_date: true,
        preferred_time: true,
        created_at: true,
      },
    },
    {
      enabled: isUUID,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Fetch reviews for rating
  const { data: reviews } = useFindManyreviews(
    {
      where: {
        provider_id: isUUID ? name : undefined,
      },
      select: {
        id: true,
        rating: true,
      },
    },
    {
      enabled: isUUID,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Calculate average rating
  const { averageRating, reviewCount } = React.useMemo(() => {
    if (!reviews || reviews.length === 0) {
      return { averageRating: 0, reviewCount: 0 };
    }
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return {
      averageRating: Math.round((sum / reviews.length) * 10) / 10,
      reviewCount: reviews.length,
    };
  }, [reviews]);

  // Calculate stats from requests
  const requestStats = React.useMemo(() => {
    if (!providerRequests) return { completedCount: 0, failedCount: 0 };

    let completed = 0;
    let failed = 0;

    for (const req of providerRequests) {
      if (req.status === "completed") {
        completed++;
      } else if (
        req.status === "rejected" ||
        req.status === "cancelled_by_provider"
      ) {
        failed++;
      } else if (req.status === "pending" && req.preferred_date) {
        const prefDate = new Date(req.preferred_date);
        const now = new Date();

        if (req.preferred_time) {
          const [hours, minutes] = req.preferred_time.split(":").map(Number);
          prefDate.setHours(hours, minutes, 0, 0);
        } else {
          prefDate.setHours(9, 0, 0, 0);
        }

        const deadline = new Date(prefDate.getTime() - 5 * 60 * 60 * 1000);
        if (now > deadline) {
          failed++;
        }
      }
    }

    return { completedCount: completed, failedCount: failed };
  }, [providerRequests]);

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Image
            src="/icons/7486744.png"
            alt="Олдсонгүй"
            width={80}
            height={80}
            className="mx-auto mb-4 opacity-70"
          />
          <h1 className="text-xl md:text-2xl font-bold mb-4">Профайл олдсонгүй</h1>
          <Link href="/">
            <Button>Нүүр хуудас руу буцах</Button>
          </Link>
        </div>
      </div>
    );
  }

  const providerName = profile.is_company
    ? profile.company_name || "Компани"
    : `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Хэрэглэгч";

  const memberSince = profile.created_at
    ? new Date(profile.created_at).getFullYear().toString()
    : "2024";

  // Stats from real data
  const stats = {
    rating: averageRating,
    reviews: reviewCount,
    successfulServices: requestStats.completedCount,
    failedServices: requestStats.failedCount,
    likes: 0,
  };

  const totalServices = stats.successfulServices + stats.failedServices;
  const successRate = totalServices > 0
    ? Math.round((stats.successfulServices / totalServices) * 100)
    : 100;

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
          {/* Mobile Nav - only notifications bell */}
          <div className="flex md:hidden items-center gap-2">
            <NotificationsButton />
          </div>
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-4">
            <NotificationsButton />
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
              <div className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full overflow-hidden ring-4 ring-white dark:ring-gray-800 shadow-xl bg-muted">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={providerName}
                    width={160}
                    height={160}
                    unoptimized={profile.avatar_url.includes("dicebear")}
                    className="w-full h-full object-cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-muted-foreground">
                    {providerName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {profile.role === "admin" && (
                <div className="absolute bottom-2 right-2 bg-blue-500 rounded-full p-1.5 md:p-2 ring-2 ring-white dark:ring-gray-800">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-white" />
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2">
                {providerName}
              </h2>
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold text-foreground">{stats.rating > 0 ? stats.rating : "-"}</span>
                  <span>({stats.reviews} сэтгэгдэл)</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {memberSince} оноос
                </span>
              </div>

              {/* Stats - Horizontal Pills */}
              <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 rounded-full">
                  <Star className="h-5 w-5 text-yellow-500 fill-current" />
                  <span className="font-bold text-lg">{stats.rating > 0 ? stats.rating : "-"}</span>
                  <span className="text-sm text-muted-foreground">Үнэлгээ{stats.reviews > 0 ? ` (${stats.reviews})` : ""}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 rounded-full">
                  <ThumbsUp className="h-5 w-5 text-green-500" />
                  <span className="font-bold text-lg">{stats.successfulServices}</span>
                  <span className="text-sm text-muted-foreground">Амжилттай</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 rounded-full">
                  <ThumbsDown className="h-5 w-5 text-red-500" />
                  <span className="font-bold text-lg">{stats.failedServices}</span>
                  <span className="text-sm text-muted-foreground">Амжилтгүй</span>
                </div>
              </div>
            </div>

            {/* Action Buttons - Desktop */}
            <div className="hidden lg:flex flex-col gap-2">
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
            {profile.about && (
              <div className="bg-card rounded-xl border p-4 md:p-6">
                <h3 className="font-semibold text-lg mb-4">Тухай</h3>
                <p className="text-muted-foreground leading-relaxed">{profile.about}</p>
              </div>
            )}

            {/* Stats Card */}
            <div className="bg-card rounded-xl border p-4 md:p-6">
              <h3 className="font-semibold text-lg mb-4">Статистик</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Амжилттай</span>
                  <span className="font-semibold text-green-600">{stats.successfulServices}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Амжилтгүй</span>
                  <span className="font-semibold text-red-600">{stats.failedServices}</span>
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
              <Button variant="outline" className="w-full gap-2">
                <Share2 className="h-4 w-4" />
                Хуваалцах
              </Button>
            </div>
          </div>

          {/* Right Column - Services */}
          <div className="lg:col-span-2 space-y-6">
            {/* Services */}
            <div className="bg-card rounded-xl border p-4 md:p-6">
              <h3 className="font-semibold text-lg mb-4">Үйлчилгээнүүд</h3>
              {isLoadingListings ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : listings && listings.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {listings.map((listing) => {
                    const coverImage = listing.images?.[0];
                    return (
                      <Link key={listing.id} href={`/services/${listing.slug}`}>
                        <div className="group border rounded-xl overflow-hidden hover:shadow-lg transition-all cursor-pointer">
                          <div className="aspect-video overflow-hidden bg-muted relative">
                            {coverImage?.url ? (
                              <Image
                                src={coverImage.url}
                                alt={coverImage.alt || listing.title}
                                fill
                                sizes="(max-width: 640px) 100vw, 50vw"
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Image
                                  src="/icons/7486744.png"
                                  alt="No image"
                                  width={48}
                                  height={48}
                                  className="opacity-50"
                                />
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            {listing.category && (
                              <span className="text-xs px-2 py-1 bg-muted rounded-full">
                                {listing.category.name}
                              </span>
                            )}
                            <h4 className="font-medium mt-2">{listing.title}</h4>
                            <p className="text-primary font-bold text-lg mt-1">
                              {listing.price?.toLocaleString()}₮
                              {listing.is_negotiable && (
                                <span className="text-sm font-normal text-muted-foreground ml-1">
                                  (тохиролцоно)
                                </span>
                              )}
                            </p>
                            {listing.aimag && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" />
                                {listing.aimag.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Image
                    src="/icons/7486744.png"
                    alt="Үйлчилгээ байхгүй"
                    width={64}
                    height={64}
                    className="mx-auto mb-3 opacity-50"
                  />
                  <p>Үйлчилгээ байхгүй байна</p>
                </div>
              )}
            </div>

            {/* Reviews Placeholder */}
            <div className="bg-card rounded-xl border p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Сэтгэгдэлүүд
                </h3>
                <span className="text-sm text-muted-foreground">{stats.reviews} сэтгэгдэл</span>
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
