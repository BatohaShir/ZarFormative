"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { InnerHeader } from "@/components/app-header";
import { Footer } from "@/components/footer";
import { MapPin, ThumbsUp, ThumbsDown, Clock, GraduationCap, Briefcase } from "lucide-react";
import { VerifiedBadge } from "@/components/verified-badge";
import { SocialShareButtons } from "@/components/social-share-buttons";
import { formatWorkDate } from "@/lib/data/suggestions";
import { cn } from "@/lib/utils";
import type { ReviewWithClient } from "@/components/ui/review-item";
import type {
  PublicProfileEducation,
  PublicProfileWorkExperience,
} from "@/lib/profile/public-profile-query";

// Reviews fire their own REST call from the client; SSR'ing the
// component would block HTML streaming on a round-trip we don't
// need before paint. Lazy-load + seed with initialReviews so the
// section appears populated as soon as the chunk lands.
const ReviewsList = dynamic(() => import("@/components/reviews-list").then((m) => m.ReviewsList), {
  ssr: false,
});

interface ProfileData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  is_company: boolean;
  avatar_url: string | null;
  about: string | null;
  created_at: Date;
  role: string;
  avg_rating: number | null;
  reviews_count: number;
  completed_jobs_count: number;
  is_verified: boolean;
}

interface ListingData {
  id: string;
  title: string;
  slug: string;
  price: number | null;
  is_negotiable: boolean;
  category: { id: string; name: string; slug: string } | null;
  images: { id: string; url: string; alt: string | null }[];
  aimag: { name: string } | null;
}

interface Stats {
  rating: number;
  reviewsCount: number;
  completedCount: number;
  failedCount: number;
}

interface PublicProfileClientProps {
  profile: ProfileData;
  listings: ListingData[];
  stats: Stats;
  /**
   * SSR-seeded first page of this provider's reviews. Piped into
   * <ReviewsList /> so the section renders populated on first paint
   * instead of flashing a loading state while the client hits the
   * reviews endpoint.
   */
  initialReviews?: ReviewWithClient[];
  initialReviewsTotal?: number;
  educations: PublicProfileEducation[];
  workExperiences: PublicProfileWorkExperience[];
}

function formatPrice(value: number | null, negotiable: boolean): string {
  if (negotiable) return "Тохиролцоно";
  if (value == null) return "—";
  return `${value.toLocaleString("mn-MN")}₮`;
}

function toYearMonth(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toISOString().slice(0, 7);
}

export function PublicProfileClient({
  profile,
  listings,
  stats,
  initialReviews,
  initialReviewsTotal,
  educations,
  workExperiences,
}: PublicProfileClientProps) {
  const router = useRouter();

  // Single stable callback for hover-prefetching any listing detail.
  // Creating one closure per card (inside .map) would build 12 new
  // functions on every re-render; this version is stable across
  // renders and takes the slug off the event target.
  const prefetchDetail = React.useCallback(
    (e: React.MouseEvent<HTMLAnchorElement> | React.FocusEvent<HTMLAnchorElement>) => {
      const slug = e.currentTarget.dataset.slug;
      if (slug) router.prefetch(`/services/${slug}`);
    },
    [router]
  );

  // Memoize derivations that only change when `profile` / `stats` do.
  const providerName = React.useMemo(
    () =>
      profile.is_company
        ? profile.company_name || "Компани"
        : `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Хэрэглэгч",
    [profile.is_company, profile.company_name, profile.first_name, profile.last_name]
  );

  const memberSince = React.useMemo(
    () => new Date(profile.created_at).getFullYear().toString(),
    [profile.created_at]
  );

  const totalServices = stats.completedCount + stats.failedCount;

  const showIndividualSections = !profile.is_company;
  const hasEducation = educations.length > 0;
  const hasWork = workExperiences.length > 0;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Shared header — same markup loading.tsx uses so there's no
          flash when the server data lands and this client takes over. */}
      <InnerHeader />

      <div className="container mx-auto px-4 md:px-6 py-6 md:py-10">
        {/* Profile Header — editorial, no gradients */}
        <div className="bg-card rounded-2xl ring-1 ring-border p-5 md:p-8 mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row md:items-start gap-5 md:gap-8">
            {/* Avatar */}
            <div className="relative self-center md:self-start shrink-0">
              <div className="w-28 h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-full overflow-hidden ring-1 ring-border bg-muted">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={providerName}
                    width={144}
                    height={144}
                    unoptimized={profile.avatar_url.includes("dicebear")}
                    className="w-full h-full object-cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-display text-4xl font-bold text-foreground">
                    {providerName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Name + meta + stats pills */}
            <div className="flex-1 min-w-0 text-center md:text-left">
              <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight inline-flex items-center gap-2 flex-wrap justify-center md:justify-start">
                <span className="wrap-anywhere">{providerName}</span>
                <VerifiedBadge verified={profile.is_verified} size="lg" />
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-1.5 justify-center md:justify-start tabular">
                <Clock className="h-3.5 w-3.5" />
                {memberSince} оноос хойш гишүүн
              </p>

              {/* Stats pills — canonical design */}
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-4">
                <span className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-muted text-sm">
                  <Briefcase className="h-4 w-4 text-foreground" />
                  <span className="font-display font-semibold tabular">{totalServices}</span>
                  <span className="text-muted-foreground">Үйлчилгээ үзүүлсэн</span>
                </span>
                <span className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-muted text-sm">
                  <ThumbsUp className="h-4 w-4 text-emerald-500" />
                  <span className="font-display font-semibold tabular">{stats.completedCount}</span>
                  <span className="text-muted-foreground">Амжилттай</span>
                </span>
                <span className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-muted text-sm">
                  <ThumbsDown className="h-4 w-4 text-red-500" />
                  <span className="font-display font-semibold tabular">{stats.failedCount}</span>
                  <span className="text-muted-foreground">Амжилтгүй</span>
                </span>
              </div>
            </div>

            {/* Share — desktop */}
            <div className="hidden lg:flex shrink-0">
              <SocialShareButtons title={providerName} description={profile.about || undefined} />
            </div>
          </div>
        </div>

        {/* Main content — single column flow, sections stretch
            full-width so services, education and work timelines read
            naturally regardless of how much each profile has filled
            in. Two-column split on large screens only for the two
            peer timelines (education + work) when both are present. */}
        <div className="space-y-6 md:space-y-8">
          {/* Mobile share (desktop is in hero) */}
          <div className="lg:hidden">
            <SocialShareButtons title={providerName} description={profile.about || undefined} />
          </div>

          {/* About */}
          {profile.about && (
            <section>
              <div className="mb-3 md:mb-4">
                <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight">Тухай</h2>
              </div>
              <div className="bg-card rounded-2xl ring-1 ring-border p-5 md:p-6">
                <p className="text-sm md:text-base text-foreground/80 leading-relaxed whitespace-pre-wrap wrap-anywhere">
                  {profile.about}
                </p>
              </div>
            </section>
          )}

          {/* Services */}
          <section>
            <div className="mb-3 md:mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight">
                  Үйлчилгээнүүд
                </h2>
                {listings.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-0.5 tabular">
                    {listings.length} зар
                  </p>
                )}
              </div>
            </div>
            {listings.length > 0 ? (
              <div className="stagger grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {listings.map((listing, index) => {
                  const coverImage = listing.images?.[0];
                  const isPriority = index < 4;
                  return (
                    <div key={listing.id} className="h-full" style={{ ["--i" as string]: index }}>
                      <Link
                        href={`/services/${listing.slug}`}
                        prefetch={null}
                        data-slug={listing.slug}
                        onMouseEnter={prefetchDetail}
                        onFocus={prefetchDetail}
                        className={cn(
                          "group relative flex h-full flex-col rounded-2xl overflow-hidden",
                          "bg-card ring-1 ring-border transition-all duration-200",
                          "hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.99]"
                        )}
                        style={{ transitionTimingFunction: "var(--ease-brand)" }}
                      >
                        <div className="aspect-square overflow-hidden bg-muted relative">
                          {coverImage?.url ? (
                            <Image
                              src={coverImage.url}
                              alt={coverImage.alt || listing.title}
                              fill
                              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                              priority={isPriority}
                              loading={isPriority ? undefined : "lazy"}
                              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                              style={{ transitionTimingFunction: "var(--ease-brand)" }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Image
                                src="/icons/7486744.webp"
                                alt=""
                                width={48}
                                height={48}
                                className="opacity-50"
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col p-3.5 md:p-4 space-y-2">
                          <div className="space-y-1">
                            {listing.category && (
                              <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wide font-medium">
                                {listing.category.name}
                              </span>
                            )}
                            <h4 className="font-display font-semibold text-[15px] md:text-base leading-snug line-clamp-2 min-h-10">
                              {listing.title}
                            </h4>
                          </div>
                          <p className="font-display text-lg md:text-xl font-bold tabular tracking-tight">
                            {formatPrice(listing.price, listing.is_negotiable)}
                          </p>
                          {listing.aimag && (
                            <div className="mt-auto pt-1.5 border-t border-border">
                              <div className="flex items-center gap-1.5 text-muted-foreground pt-2">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="text-[11px] md:text-xs truncate flex-1">
                                  {listing.aimag.name}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 md:py-20 text-center rounded-2xl bg-muted/40">
                <Image
                  src="/icons/7486744.webp"
                  alt=""
                  width={72}
                  height={72}
                  className="mb-4 opacity-50"
                />
                <p className="font-display text-lg font-semibold">Үйлчилгээ байхгүй байна</p>
              </div>
            )}
          </section>

          {/* Education + Work — side-by-side on desktop when both
              exist, single column otherwise. Full-width containers
              let timelines breathe on any screen. */}
          {showIndividualSections && (hasEducation || hasWork) && (
            <div
              className={cn(
                "grid gap-6 md:gap-8",
                hasEducation && hasWork ? "lg:grid-cols-2" : "grid-cols-1"
              )}
            >
              {hasEducation && (
                <section>
                  <div className="mb-3 md:mb-4">
                    <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 md:h-6 md:w-6" />
                      Боловсрол
                    </h2>
                  </div>
                  <div className="bg-card rounded-2xl ring-1 ring-border p-4 md:p-6">
                    <div className="relative pl-2 space-y-3">
                      {educations.map((edu) => (
                        <div
                          key={edu.id}
                          className={cn(
                            "relative pl-10 pr-4 py-3 rounded-xl bg-muted/30 transition-colors",
                            "before:absolute before:left-4 before:-top-3 before:h-3 before:w-px before:bg-border first:before:hidden",
                            edu.is_current && "ml-6 ring-1 ring-blue-500/30"
                          )}
                        >
                          <span className="absolute left-2.75 top-5 flex items-center justify-center">
                            {edu.is_current && (
                              <span className="absolute inline-flex h-4 w-4 rounded-full bg-blue-500/40 animate-ping" />
                            )}
                            <span
                              className={cn(
                                "relative w-2.5 h-2.5 rounded-full ring-2 ring-background",
                                edu.is_current ? "bg-blue-500" : "bg-foreground"
                              )}
                            />
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-display font-semibold tracking-tight">
                                {edu.degree}
                              </p>
                              {edu.is_current && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-semibold uppercase tracking-wide">
                                  <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                                  Одоо
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{edu.institution}</p>
                            {edu.field_of_study && (
                              <p className="text-sm text-muted-foreground">{edu.field_of_study}</p>
                            )}
                            <p className="text-sm text-muted-foreground mt-1 tabular">
                              {formatWorkDate(toYearMonth(edu.start_date))} —{" "}
                              {edu.is_current
                                ? "Одоог хүртэл"
                                : edu.end_date
                                  ? formatWorkDate(toYearMonth(edu.end_date))
                                  : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {hasWork && (
                <section>
                  <div className="mb-3 md:mb-4">
                    <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
                      <Briefcase className="h-5 w-5 md:h-6 md:w-6" />
                      Ажлын туршлага
                    </h2>
                  </div>
                  <div className="bg-card rounded-2xl ring-1 ring-border p-4 md:p-6">
                    <div className="relative pl-2 space-y-3">
                      {workExperiences.map((work) => (
                        <div
                          key={work.id}
                          className={cn(
                            "relative pl-10 pr-4 py-3 rounded-xl bg-muted/30 transition-colors",
                            "before:absolute before:left-4 before:-top-3 before:h-3 before:w-px before:bg-border first:before:hidden",
                            work.is_current && "ml-6 ring-1 ring-blue-500/30"
                          )}
                        >
                          <span className="absolute left-2.75 top-5 flex items-center justify-center">
                            {work.is_current && (
                              <span className="absolute inline-flex h-4 w-4 rounded-full bg-blue-500/40 animate-ping" />
                            )}
                            <span
                              className={cn(
                                "relative w-2.5 h-2.5 rounded-full ring-2 ring-background",
                                work.is_current ? "bg-blue-500" : "bg-foreground"
                              )}
                            />
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-display font-semibold tracking-tight">
                                {work.position}
                              </p>
                              {work.is_current && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-semibold uppercase tracking-wide">
                                  <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                                  Одоо
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{work.company}</p>
                            <p className="text-sm text-muted-foreground mt-1 tabular">
                              {formatWorkDate(toYearMonth(work.start_date))} —{" "}
                              {work.is_current
                                ? "Одоог хүртэл"
                                : work.end_date
                                  ? formatWorkDate(toYearMonth(work.end_date))
                                  : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Reviews */}
          <section>
            <div className="mb-3 md:mb-4">
              <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight">
                Сэтгэгдэл
              </h2>
            </div>
            <div className="bg-card rounded-2xl ring-1 ring-border p-4 md:p-6">
              <ReviewsList
                providerId={profile.id}
                variant="mobile"
                initialReviews={initialReviews}
                initialTotal={initialReviewsTotal}
              />
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
