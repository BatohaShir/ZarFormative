"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@zenstackhq/tanstack-query/runtime-v5";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteHeader } from "@/components/site-header";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import {
  User,
  Star,
  ThumbsUp,
  BadgeCheck,
  ThumbsDown,
  Mail,
  Phone,
  Pencil,
  GraduationCap,
  Briefcase,
  Plus,
  Trash2,
  Camera,
  X,
  FileText,
  Check,
  Building2,
  Hash,
  Settings,
  Package,
  BarChart3,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { useEducations, type Education } from "@/hooks/use-educations";
import { useWorkExperiences, type WorkExperience } from "@/hooks/use-work-experiences";
// Realtime хук для автоматического обновления данных без перезагрузки страницы
import { useRealtimeProfile } from "@/hooks/use-realtime-profile";
// Skeleton компоненты для красивой загрузки
import {
  ProfileSkeleton,
  EducationSkeleton,
  WorkExperienceSkeleton,
} from "@/components/profile-skeleton";
// REMOVED: useFindManylisting_requests, useFindManyreviews - используем денормализованные данные из профиля
import {
  SCHOOLS_DB,
  COMPANIES_DB,
  POSITIONS_DB,
  DEGREES_DB,
  formatWorkDate,
} from "@/lib/data/suggestions";
import type { MyProfileSsrData } from "@/lib/profile/my-profile-query";
import { VerifiedBadge } from "@/components/verified-badge";

// Lazy load EditProfileModal - not loaded until opened
const EditProfileModal = dynamic(
  () =>
    import("@/components/edit-profile-modal").then((mod) => ({ default: mod.EditProfileModal })),
  { ssr: false }
);

interface NewEducationForm {
  institution: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

interface NewWorkExperienceForm {
  company: string;
  position: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

const initialEducationForm: NewEducationForm = {
  institution: "",
  degree: "",
  field_of_study: "",
  start_date: "",
  end_date: "",
  is_current: false,
};

const initialWorkForm: NewWorkExperienceForm = {
  company: "",
  position: "",
  start_date: "",
  end_date: "",
  is_current: false,
};

interface MyProfileClientProps {
  /**
   * Server-seeded profile + educations + work from one CTE round-trip.
   * When provided, the client skips its mount-time REST fetches and
   * renders from this payload immediately. `profile` is also pushed
   * into React Query's cache via setQueryData so AuthProvider's
   * useCurrentUser picks it up as already-fresh data.
   */
  ssrData?: MyProfileSsrData;
  /**
   * Current user id as known on the server. Passed so the seed
   * below hashes ZenStack's hook key on the very first render —
   * relying on user?.id from the client auth singleton is too late,
   * the singleton hydrates async and the useState initializer would
   * have already skipped.
   */
  ssrUserId?: string;
}

export function MyProfileClient({ ssrData, ssrUserId }: MyProfileClientProps = {}) {
  const router = useRouter();
  const t = useTranslations();
  const queryClient = useQueryClient();
  const {
    isAuthenticated,
    isLoading,
    user,
    profile,
    signOut,
    uploadAvatar,
    displayName,
    avatarUrl,
    updateProfile,
  } = useAuth();

  // Seed React Query caches from SSR once, before any child hook runs
  // its useQuery. We push three entries (profile, educations, work)
  // under the exact keys ZenStack's generated hooks use, so they see
  // `isFetched: true` on mount and skip the REST call entirely.
  //
  // useState initializer fires on first render only — using useEffect
  // here would be too late (hooks below would already have dispatched
  // a network fetch against an empty cache).
  React.useState(() => {
    if (!ssrData || !ssrUserId) return null;

    // IMPORTANT: use getQueryKey() — ZenStack's real cache key is
    //   ["zenstack", model, operation, args, {infinite, optimisticUpdate}]
    // A handrolled ["model","operation",args] key does NOT match and
    // the hook falls through to a cold REST fetch on mount.
    //
    // Args below mirror the exact useFind* calls in useCurrentUser /
    // useEducations / useWorkExperiences — any drift and the seed
    // silently misses its slot. Keying on ssrUserId (server-known)
    // not user?.id (async client singleton) so the seed lands
    // synchronously on first render.
    if (ssrData.profile) {
      queryClient.setQueryData(
        getQueryKey("profiles", "findUnique", {
          where: { id: ssrUserId },
          select: {
            id: true,
            first_name: true,
            last_name: true,
            phone_number: true,
            is_company: true,
            avatar_url: true,
            about: true,
            company_name: true,
            registration_number: true,
            is_deleted: true,
            preferred_language: true,
            avg_rating: true,
            reviews_count: true,
            completed_jobs_count: true,
            is_verified: true,
          },
        }),
        ssrData.profile
      );
    }

    // CTE returns ISO strings; Education/WorkExperience types want
    // Date objects. Coerce here so the cached data matches the shape
    // consumed by downstream components.
    queryClient.setQueryData(
      getQueryKey("profiles_educations", "findMany", {
        where: { user_id: ssrUserId },
        orderBy: { start_date: "desc" },
        select: {
          id: true,
          user_id: true,
          degree: true,
          institution: true,
          field_of_study: true,
          start_date: true,
          end_date: true,
          is_current: true,
        },
      }),
      ssrData.educations.map((e) => ({
        ...e,
        start_date: new Date(e.start_date),
        end_date: e.end_date ? new Date(e.end_date) : null,
      }))
    );

    queryClient.setQueryData(
      getQueryKey("profiles_work_experiences", "findMany", {
        where: { user_id: ssrUserId },
        orderBy: { start_date: "desc" },
        select: {
          id: true,
          user_id: true,
          company: true,
          position: true,
          description: true,
          start_date: true,
          end_date: true,
          is_current: true,
        },
      }),
      ssrData.workExperiences.map((w) => ({
        ...w,
        start_date: new Date(w.start_date),
        end_date: w.end_date ? new Date(w.end_date) : null,
      }))
    );
    return null;
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  // Local blob-URL preview shown the moment the user picks a file, so
  // the avatar flips to the chosen image immediately instead of sitting
  // under a spinner for the 1–3s upload on MN→Seoul. Cleared when the
  // server-side profile.avatar_url lands and React re-renders with the
  // canonical URL.
  const [avatarPreviewUrl, setAvatarPreviewUrl] = React.useState<string | null>(null);
  // Revoke the blob when the preview no longer matches what the UI
  // shows — otherwise the blob leaks until the tab closes.
  React.useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  // Profile editing modal state
  const [showEditProfileModal, setShowEditProfileModal] = React.useState(false);

  // About section state
  const [isEditingAbout, setIsEditingAbout] = React.useState(false);
  const [aboutText, setAboutText] = React.useState("");
  const [isSavingAbout, setIsSavingAbout] = React.useState(false);

  // Initialize about text when profile loads
  React.useEffect(() => {
    if (profile?.about !== undefined) {
      setAboutText(profile.about || "");
    }
  }, [profile?.about]);

  // Education from database. Company accounts don't display this
  // section, so skip the query — otherwise we'd pay a round-trip to
  // fetch rows that can never exist (CTE already guards against it).
  const isCompany = profile?.is_company ?? false;
  const {
    educations,
    isLoading: isEducationsLoading,
    createEducation,
    updateEducation,
    deleteEducation,
    isCreating: isCreatingEducation,
    isUpdating: isUpdatingEducation,
    isDeleting: isDeletingEducation,
  } = useEducations(undefined, {
    enabled: !isCompany,
  });

  const [showAddEducation, setShowAddEducation] = React.useState(false);
  const [editingEducationId, setEditingEducationId] = React.useState<string | null>(null);
  const [newEducation, setNewEducation] = React.useState<NewEducationForm>(initialEducationForm);

  // Work experience from database — same story as educations.
  const {
    workExperiences,
    isLoading: isWorkExperiencesLoading,
    createWorkExperience,
    updateWorkExperience,
    deleteWorkExperience,
    isCreating: isCreatingWork,
    isUpdating: isUpdatingWork,
    isDeleting: isDeletingWork,
  } = useWorkExperiences(undefined, {
    enabled: !isCompany,
  });

  const [showAddWork, setShowAddWork] = React.useState(false);
  const [editingWorkId, setEditingWorkId] = React.useState<string | null>(null);
  const [newWork, setNewWork] = React.useState<NewWorkExperienceForm>(initialWorkForm);

  // REALTIME: Подписываемся на изменения профиля для автоматического обновления UI
  // Когда кто-то оставит отзыв или изменятся данные - UI обновится без перезагрузки
  useRealtimeProfile(user?.id);

  // OPTIMIZED: Используем денормализованные данные из профиля вместо 2 отдельных запросов
  // Поля avg_rating, reviews_count, completed_jobs_count обновляются триггером в БД
  const averageRating = profile?.avg_rating ? Number(profile.avg_rating) : 0;
  const reviewCount = profile?.reviews_count ?? 0;
  const completedCount = profile?.completed_jobs_count ?? 0;
  // Note: failedCount убран - требует отдельной логики для подсчёта expired requests
  const failedCount = 0; // TODO: добавить денормализованное поле если нужно

  // Redirect to home if not authenticated
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isLoading, isAuthenticated, router]);

  // Memoized sorted lists — old → new (timeline order).
  // Current ("is_current") items always go last regardless of start_date,
  // so "Одоо" пункты visually anchor the "сейчас" end of the roadmap.
  const sortedEducations = React.useMemo(() => {
    return [...educations].sort((a, b) => {
      if (a.is_current !== b.is_current) return a.is_current ? 1 : -1;
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    });
  }, [educations]);

  const sortedWorkExperiences = React.useMemo(() => {
    return [...workExperiences].sort((a, b) => {
      if (a.is_current !== b.is_current) return a.is_current ? 1 : -1;
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    });
  }, [workExperiences]);

  const handleLogout = React.useCallback(async () => {
    await signOut();
    router.push("/");
  }, [signOut, router]);

  const handleAvatarChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      // Show the chosen file immediately. Upload runs in the background;
      // when it resolves the parent profile.avatar_url updates and the
      // <Image src> falls back to the canonical URL. isUploadingAvatar
      // still drives a small busy indicator, but the picture itself
      // flips on the spot.
      const localUrl = URL.createObjectURL(file);
      setAvatarPreviewUrl(localUrl);
      setIsUploadingAvatar(true);
      try {
        await uploadAvatar(file);
      } finally {
        setIsUploadingAvatar(false);
      }
    },
    [uploadAvatar]
  );

  // Education handlers
  const resetEducationForm = React.useCallback(() => {
    setNewEducation(initialEducationForm);
  }, []);

  const handleAddEducation = React.useCallback(async () => {
    if (!newEducation.institution || !newEducation.degree || !newEducation.start_date) return;

    const { error } = await createEducation({
      degree: newEducation.degree,
      institution: newEducation.institution,
      field_of_study: newEducation.field_of_study || undefined,
      start_date: new Date(newEducation.start_date),
      end_date: newEducation.end_date ? new Date(newEducation.end_date) : undefined,
      is_current: newEducation.is_current,
    });

    if (!error) {
      resetEducationForm();
      setShowAddEducation(false);
    }
  }, [newEducation, createEducation, resetEducationForm]);

  const handleEditEducation = React.useCallback((edu: Education) => {
    setEditingEducationId(edu.id);
    setNewEducation({
      institution: edu.institution,
      degree: edu.degree,
      field_of_study: edu.field_of_study || "",
      start_date: edu.start_date ? new Date(edu.start_date).toISOString().slice(0, 7) : "",
      end_date: edu.end_date ? new Date(edu.end_date).toISOString().slice(0, 7) : "",
      is_current: edu.is_current,
    });
  }, []);

  const handleSaveEducation = React.useCallback(async () => {
    if (!editingEducationId) return;
    if (!newEducation.institution || !newEducation.degree || !newEducation.start_date) return;

    const { error } = await updateEducation(editingEducationId, {
      degree: newEducation.degree,
      institution: newEducation.institution,
      field_of_study: newEducation.field_of_study || undefined,
      start_date: new Date(newEducation.start_date),
      end_date: newEducation.end_date ? new Date(newEducation.end_date) : undefined,
      is_current: newEducation.is_current,
    });

    if (!error) {
      setEditingEducationId(null);
      resetEducationForm();
    }
  }, [editingEducationId, newEducation, updateEducation, resetEducationForm]);

  const handleCancelEditEducation = React.useCallback(() => {
    setEditingEducationId(null);
    resetEducationForm();
  }, [resetEducationForm]);

  const handleDeleteEducation = React.useCallback(
    async (id: string) => {
      await deleteEducation(id);
    },
    [deleteEducation]
  );

  // Work experience handlers
  const resetWorkForm = React.useCallback(() => {
    setNewWork(initialWorkForm);
  }, []);

  const handleAddWork = React.useCallback(async () => {
    if (!newWork.company || !newWork.position || !newWork.start_date) return;

    const { error } = await createWorkExperience({
      company: newWork.company,
      position: newWork.position,
      start_date: new Date(newWork.start_date),
      end_date: newWork.end_date ? new Date(newWork.end_date) : undefined,
      is_current: newWork.is_current,
    });

    if (!error) {
      resetWorkForm();
      setShowAddWork(false);
    }
  }, [newWork, createWorkExperience, resetWorkForm]);

  const handleEditWork = React.useCallback((work: WorkExperience) => {
    setEditingWorkId(work.id);
    setNewWork({
      company: work.company,
      position: work.position,
      start_date: work.start_date ? new Date(work.start_date).toISOString().slice(0, 7) : "",
      end_date: work.end_date ? new Date(work.end_date).toISOString().slice(0, 7) : "",
      is_current: work.is_current,
    });
  }, []);

  const handleSaveWork = React.useCallback(async () => {
    if (!editingWorkId) return;
    if (!newWork.company || !newWork.position || !newWork.start_date) return;

    const { error } = await updateWorkExperience(editingWorkId, {
      company: newWork.company,
      position: newWork.position,
      start_date: new Date(newWork.start_date),
      end_date: newWork.end_date ? new Date(newWork.end_date) : undefined,
      is_current: newWork.is_current,
    });

    if (!error) {
      setEditingWorkId(null);
      resetWorkForm();
    }
  }, [editingWorkId, newWork, updateWorkExperience, resetWorkForm]);

  const handleCancelEditWork = React.useCallback(() => {
    setEditingWorkId(null);
    resetWorkForm();
  }, [resetWorkForm]);

  const handleDeleteWork = React.useCallback(
    async (id: string) => {
      await deleteWorkExperience(id);
    },
    [deleteWorkExperience]
  );

  // About handlers
  const handleSaveAbout = React.useCallback(async () => {
    setIsSavingAbout(true);
    try {
      const { error } = await updateProfile({ about: aboutText.trim() || null });
      if (!error) {
        setIsEditingAbout(false);
      }
    } finally {
      setIsSavingAbout(false);
    }
  }, [aboutText, updateProfile]);

  const handleDeleteAbout = React.useCallback(async () => {
    setIsSavingAbout(true);
    try {
      const { error } = await updateProfile({ about: null });
      if (!error) {
        setAboutText("");
        setIsEditingAbout(false);
      }
    } finally {
      setIsSavingAbout(false);
    }
  }, [updateProfile]);

  const handleCancelAbout = React.useCallback(() => {
    setAboutText(profile?.about || "");
    setIsEditingAbout(false);
  }, [profile?.about]);

  // Redirect to home if not authenticated (after loading completes)
  // Don't show loading spinner here - let Next.js loading.tsx handle it
  // This prevents flash of white screen between loading.tsx and content
  if (!isLoading && !isAuthenticated) {
    return null; // Will redirect via useEffect above
  }

  // Показываем красивый skeleton пока данные загружаются
  // Это лучше чем пустой экран - пользователь видит что страница загружается
  if (isLoading && !profile) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <SiteHeader backHref="/" />

      <div className="container mx-auto px-4 md:px-6 py-6 md:py-10">
        {/* Profile Header — editorial, no gradient */}
        <div className="mb-8 md:mb-12">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8">
            {/* Avatar */}
            <div className="relative group shrink-0">
              <div className="w-28 h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-full overflow-hidden ring-1 ring-border bg-muted">
                <Image
                  src={avatarPreviewUrl ?? avatarUrl}
                  alt={displayName}
                  width={144}
                  height={144}
                  unoptimized={avatarPreviewUrl !== null || avatarUrl.includes("dicebear")}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                disabled={isUploadingAvatar}
                aria-busy={isUploadingAvatar}
              >
                <Camera className="h-7 w-7 text-white" />
              </button>
              {isUploadingAvatar && (
                <div className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-1 shadow-md ring-1 ring-border">
                  <div className="w-3.5 h-3.5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left min-w-0">
              <h1 className="font-display font-bold tracking-tight text-3xl md:text-4xl lg:text-5xl inline-flex items-center gap-2 flex-wrap justify-center md:justify-start">
                <span>{displayName}</span>
                <VerifiedBadge verified={profile?.is_verified} size="lg" />
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5 truncate">{user?.email}</p>

              {/* Stats — semantic colors */}
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-4">
                <div className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-muted text-sm">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-display font-semibold tabular">
                    {averageRating > 0 ? averageRating : "—"}
                  </span>
                  <span className="text-muted-foreground">
                    {t("profile.rating")}
                    {reviewCount > 0 ? ` · ${reviewCount}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-muted text-sm">
                  <ThumbsUp className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="font-display font-semibold tabular">{completedCount}</span>
                  <span className="text-muted-foreground">{t("profile.completedJobs")}</span>
                </div>
                <div className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-muted text-sm">
                  <ThumbsDown className="h-3.5 w-3.5 text-red-500" />
                  <span className="font-display font-semibold tabular">{failedCount}</span>
                  <span className="text-muted-foreground">{t("profile.failedJobs")}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions — Desktop */}
            <div className="hidden lg:flex flex-col gap-2 shrink-0">
              <Link
                href="/account/me/services"
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 active:scale-[0.98] transition-all"
              >
                <Package className="h-4 w-4" />
                {t("profile.myServices")}
              </Link>
              <button
                onClick={() => setShowEditProfileModal(true)}
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full border border-border bg-card text-sm font-medium hover:bg-muted transition-colors"
              >
                <Pencil className="h-4 w-4" />
                {t("common.edit")}
              </button>
              <Link
                href="/account/me/settings"
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full border border-border bg-card text-sm font-medium hover:bg-muted transition-colors"
              >
                <Settings className="h-4 w-4" />
                {t("profile.appSettings")}
              </Link>
              <Link
                href="/account/me/stats"
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full border border-border bg-card text-sm font-medium hover:bg-muted transition-colors"
              >
                <BarChart3 className="h-4 w-4" />
                {t("profile.statistics")}
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Action Buttons */}
        <div className="lg:hidden grid grid-cols-2 gap-2 mb-8">
          <Link
            href="/account/me/services"
            className="inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-full bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 active:scale-[0.98] transition-all min-w-0"
          >
            <Package className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{t("profile.myServices")}</span>
          </Link>
          <button
            onClick={() => setShowEditProfileModal(true)}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-full border border-border bg-card text-[13px] font-medium hover:bg-muted transition-colors min-w-0"
          >
            <Pencil className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{t("common.edit")}</span>
          </button>
          <Link
            href="/account/me/settings"
            className="inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-full border border-border bg-card text-[13px] font-medium hover:bg-muted transition-colors min-w-0"
          >
            <Settings className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{t("profile.appSettings")}</span>
          </Link>
          <Link
            href="/account/me/stats"
            className="inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-full border border-border bg-card text-[13px] font-medium hover:bg-muted transition-colors min-w-0"
          >
            <BarChart3 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{t("profile.statistics")}</span>
          </Link>
        </div>

        {/* Verification Goal — hidden once the account is verified.
            The blue check next to the name already signals the status,
            a 20/20 progress bar would just be noise. */}
        {!profile?.is_verified &&
          (() => {
            const GOAL = 20;
            const done = Math.min(completedCount, GOAL);
            const progress = (done / GOAL) * 100;
            const remaining = Math.max(GOAL - done, 0);
            return (
              <div className="rounded-2xl ring-1 ring-border bg-card p-5 md:p-6 mb-6 md:mb-8">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                    <BadgeCheck className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-display font-semibold text-base">
                      {t("stats.verifiedTitle")}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("stats.verifiedDesc")}
                    </p>
                  </div>
                </div>

                <div className="relative h-2 bg-muted rounded-full overflow-hidden mb-3">
                  <div
                    className="absolute inset-y-0 left-0 bg-linear-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="font-display font-semibold text-blue-500 tabular">
                    {done}/{GOAL}
                  </span>
                  <span className="text-muted-foreground">
                    {remaining > 0
                      ? t("stats.remaining", { count: remaining })
                      : t("stats.goalReached")}
                  </span>
                </div>
              </div>
            );
          })()}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Left Column - Personal Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card rounded-xl border p-4 md:p-6">
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                {profile?.is_company ? (
                  <Building2 className="h-5 w-5 text-primary" />
                ) : (
                  <User className="h-5 w-5 text-primary" />
                )}
                {profile?.is_company ? t("profile.companyInfo") : t("profile.personalInfo")}
              </h3>

              <div className="space-y-4">
                {profile?.is_company ? (
                  <>
                    <div className="flex items-start gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">{t("profile.name")}</p>
                        <p className="font-medium truncate">{profile?.company_name || "-"}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Hash className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">
                          {t("profile.registrationNumber")}
                        </p>
                        <p className="font-medium truncate">
                          {profile?.registration_number || "-"}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">{t("profile.name")}</p>
                        <p className="font-medium truncate">{profile?.first_name || "-"}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">{t("profile.lastName")}</p>
                        <p className="font-medium truncate">{profile?.last_name || "-"}</p>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{t("auth.email")}</p>
                    <p className="font-medium truncate">{user?.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{t("profile.phone")}</p>
                    <p className="font-medium truncate">{profile?.phone_number || "-"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* About Section - only for individuals */}
            {!profile?.is_company && (
              <div className="bg-card rounded-xl border p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    {t("profile.about")}
                  </h3>
                  {!isEditingAbout && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => setIsEditingAbout(true)}
                    >
                      {profile?.about ? (
                        <>
                          <Pencil className="h-4 w-4" />
                          {t("common.edit")}
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          {t("common.add")}
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {isEditingAbout ? (
                  <div className="space-y-3">
                    <Textarea
                      placeholder={t("profile.aboutPlaceholder")}
                      value={aboutText}
                      onChange={(e) => setAboutText(e.target.value)}
                      className="min-h-30 resize-none"
                      maxLength={500}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{aboutText.length}/500</span>
                      <div className="flex gap-2">
                        {profile?.about && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDeleteAbout}
                            disabled={isSavingAbout}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            {t("common.delete")}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelAbout}
                          disabled={isSavingAbout}
                        >
                          {t("common.cancel")}
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveAbout}
                          disabled={isSavingAbout || !aboutText.trim()}
                        >
                          {isSavingAbout ? (
                            t("common.saving")
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              {t("common.save")}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : profile?.about ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {profile.about}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t("profile.noAbout")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Education & Work (for individuals) OR About Company (for companies) */}
          <div className="lg:col-span-2 space-y-6">
            {profile?.is_company ? (
              /* Company About Section */
              <div className="bg-card rounded-xl border p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    {t("profile.aboutCompany")}
                  </h3>
                  {!isEditingAbout && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => setIsEditingAbout(true)}
                    >
                      {profile?.about ? (
                        <>
                          <Pencil className="h-4 w-4" />
                          {t("common.edit")}
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          {t("common.add")}
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {isEditingAbout ? (
                  <div className="space-y-3">
                    <Textarea
                      placeholder={t("profile.aboutCompanyPlaceholder")}
                      value={aboutText}
                      onChange={(e) => setAboutText(e.target.value)}
                      className="min-h-40 resize-none"
                      maxLength={1000}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{aboutText.length}/1000</span>
                      <div className="flex gap-2">
                        {profile?.about && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDeleteAbout}
                            disabled={isSavingAbout}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            {t("common.delete")}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelAbout}
                          disabled={isSavingAbout}
                        >
                          {t("common.cancel")}
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveAbout}
                          disabled={isSavingAbout || !aboutText.trim()}
                        >
                          {isSavingAbout ? (
                            t("common.saving")
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              {t("common.save")}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : profile?.about ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {profile.about}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {t("profile.noAbout")}
                  </p>
                )}
              </div>
            ) : (
              /* Education & Work Experience for individuals */
              <>
                {/* Education */}
                <div className="bg-card rounded-xl border p-4 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      {t("profile.education")}
                    </h3>
                    {!showAddEducation && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => setShowAddEducation(true)}
                      >
                        <Plus className="h-4 w-4" />
                        {t("common.add")}
                      </Button>
                    )}
                  </div>

                  {/* Add Education Form */}
                  {showAddEducation && (
                    <div className="p-4 border rounded-lg space-y-3 bg-muted/20 mb-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{t("profile.addEducation")}</h4>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setShowAddEducation(false);
                            resetEducationForm();
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <AutocompleteInput
                        placeholder={t("profile.schoolName")}
                        value={newEducation.institution}
                        onChange={(value) =>
                          setNewEducation({ ...newEducation, institution: value })
                        }
                        suggestions={SCHOOLS_DB}
                        className="h-10"
                      />
                      <AutocompleteInput
                        placeholder={t("profile.degree")}
                        value={newEducation.degree}
                        onChange={(value) => setNewEducation({ ...newEducation, degree: value })}
                        suggestions={DEGREES_DB}
                        className="h-10"
                      />
                      <Input
                        placeholder={t("profile.fieldOfStudy")}
                        value={newEducation.field_of_study}
                        onChange={(e) =>
                          setNewEducation({ ...newEducation, field_of_study: e.target.value })
                        }
                        className="h-10"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">
                            {t("profile.startDate")}
                          </label>
                          <Input
                            type="month"
                            value={newEducation.start_date}
                            onChange={(e) =>
                              setNewEducation({
                                ...newEducation,
                                start_date: e.target.value,
                              })
                            }
                            className="h-10"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">
                            {t("profile.endDate")}
                          </label>
                          <Input
                            type="month"
                            value={newEducation.end_date}
                            onChange={(e) =>
                              setNewEducation({
                                ...newEducation,
                                end_date: e.target.value,
                              })
                            }
                            disabled={newEducation.is_current}
                            className="h-10"
                          />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newEducation.is_current}
                          onChange={(e) =>
                            setNewEducation({
                              ...newEducation,
                              is_current: e.target.checked,
                              end_date: "",
                            })
                          }
                          className="rounded"
                        />
                        <span className="text-sm">{t("profile.currentlyStudying")}</span>
                      </label>
                      <Button
                        className="w-full"
                        onClick={handleAddEducation}
                        disabled={
                          isCreatingEducation ||
                          !newEducation.institution ||
                          !newEducation.degree ||
                          !newEducation.start_date
                        }
                      >
                        {isCreatingEducation ? t("common.saving") : t("common.save")}
                      </Button>
                    </div>
                  )}

                  {/* Education List — roadmap timeline */}
                  {isEducationsLoading ? (
                    <EducationSkeleton />
                  ) : educations.length === 0 && !showAddEducation ? (
                    <p className="text-muted-foreground text-center py-8">
                      {t("profile.noEducation")}
                    </p>
                  ) : (
                    <div className="grid gap-3">
                      {sortedEducations.map((edu) =>
                        editingEducationId === edu.id ? (
                          <div key={edu.id} className="p-4 border rounded-lg space-y-3 bg-muted/20">
                            <AutocompleteInput
                              placeholder={t("profile.schoolName")}
                              value={newEducation.institution}
                              onChange={(value) =>
                                setNewEducation({ ...newEducation, institution: value })
                              }
                              suggestions={SCHOOLS_DB}
                              className="h-10"
                            />
                            <AutocompleteInput
                              placeholder={t("profile.degree")}
                              value={newEducation.degree}
                              onChange={(value) =>
                                setNewEducation({ ...newEducation, degree: value })
                              }
                              suggestions={DEGREES_DB}
                              className="h-10"
                            />
                            <Input
                              placeholder={t("profile.fieldOfStudy")}
                              value={newEducation.field_of_study}
                              onChange={(e) =>
                                setNewEducation({ ...newEducation, field_of_study: e.target.value })
                              }
                              className="h-10"
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">
                                  {t("profile.startDate")}
                                </label>
                                <Input
                                  type="month"
                                  value={newEducation.start_date}
                                  onChange={(e) =>
                                    setNewEducation({
                                      ...newEducation,
                                      start_date: e.target.value,
                                    })
                                  }
                                  className="h-10"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">
                                  {t("profile.endDate")}
                                </label>
                                <Input
                                  type="month"
                                  value={newEducation.end_date}
                                  onChange={(e) =>
                                    setNewEducation({
                                      ...newEducation,
                                      end_date: e.target.value,
                                    })
                                  }
                                  disabled={newEducation.is_current}
                                  className="h-10"
                                />
                              </div>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newEducation.is_current}
                                onChange={(e) =>
                                  setNewEducation({
                                    ...newEducation,
                                    is_current: e.target.checked,
                                    end_date: "",
                                  })
                                }
                                className="rounded"
                              />
                              <span className="text-sm">{t("profile.currentlyStudying")}</span>
                            </label>
                            <div className="flex gap-2">
                              <Button
                                className="flex-1"
                                onClick={handleSaveEducation}
                                disabled={
                                  isUpdatingEducation ||
                                  !newEducation.institution ||
                                  !newEducation.degree ||
                                  !newEducation.start_date
                                }
                              >
                                {isUpdatingEducation ? t("common.saving") : t("common.save")}
                              </Button>
                              <Button variant="outline" onClick={handleCancelEditEducation}>
                                {t("common.cancel")}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div
                            key={edu.id}
                            className={`relative pl-10 pr-4 py-3 rounded-xl group bg-muted/30 hover:bg-muted/50 transition-colors before:absolute before:left-4 before:-top-3 before:h-3 before:w-px before:bg-border first:before:hidden ${
                              edu.is_current ? "ml-6 ring-1 ring-blue-500/30" : ""
                            }`}
                          >
                            {/* Timeline dot */}
                            <span className="absolute left-2.75 top-5 flex items-center justify-center">
                              {edu.is_current && (
                                <span className="absolute inline-flex h-4 w-4 rounded-full bg-blue-500/40 animate-ping" />
                              )}
                              <span
                                className={`relative w-2.5 h-2.5 rounded-full ring-2 ring-background ${
                                  edu.is_current ? "bg-blue-500" : "bg-foreground"
                                }`}
                              />
                            </span>
                            <div className="pr-20">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium">{edu.degree}</p>
                                {edu.is_current && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-semibold uppercase tracking-wide">
                                    <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                                    Одоо
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{edu.institution}</p>
                              {edu.field_of_study && (
                                <p className="text-sm text-muted-foreground">
                                  {edu.field_of_study}
                                </p>
                              )}
                              <p className="text-sm text-muted-foreground mt-1 tabular">
                                {formatWorkDate(new Date(edu.start_date).toISOString().slice(0, 7))}{" "}
                                —{" "}
                                {edu.is_current
                                  ? t("common.present")
                                  : edu.end_date
                                    ? formatWorkDate(
                                        new Date(edu.end_date).toISOString().slice(0, 7)
                                      )
                                    : ""}
                              </p>
                            </div>
                            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEditEducation(edu)}
                                className="p-2 rounded-md hover:bg-muted text-foreground"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteEducation(edu.id)}
                                disabled={isDeletingEducation}
                                className="p-2 rounded-md hover:bg-muted text-destructive disabled:opacity-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* Work Experience */}
                <div className="bg-card rounded-xl border p-4 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-primary" />
                      {t("profile.workExperience")}
                    </h3>
                    {!showAddWork && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => setShowAddWork(true)}
                      >
                        <Plus className="h-4 w-4" />
                        {t("common.add")}
                      </Button>
                    )}
                  </div>

                  {/* Add Work Form */}
                  {showAddWork && (
                    <div className="p-4 border rounded-lg space-y-3 bg-muted/20 mb-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{t("profile.addWorkExperience")}</h4>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setShowAddWork(false);
                            resetWorkForm();
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <AutocompleteInput
                        placeholder={t("profile.companyNamePlaceholder")}
                        value={newWork.company}
                        onChange={(value) => setNewWork({ ...newWork, company: value })}
                        suggestions={COMPANIES_DB}
                        className="h-10"
                      />
                      <AutocompleteInput
                        placeholder={t("profile.position")}
                        value={newWork.position}
                        onChange={(value) => setNewWork({ ...newWork, position: value })}
                        suggestions={POSITIONS_DB}
                        className="h-10"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">
                            {t("profile.startDate")}
                          </label>
                          <Input
                            type="month"
                            value={newWork.start_date}
                            onChange={(e) => setNewWork({ ...newWork, start_date: e.target.value })}
                            className="h-10"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">
                            {t("profile.endDate")}
                          </label>
                          <Input
                            type="month"
                            value={newWork.end_date}
                            onChange={(e) => setNewWork({ ...newWork, end_date: e.target.value })}
                            disabled={newWork.is_current}
                            className="h-10"
                          />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newWork.is_current}
                          onChange={(e) =>
                            setNewWork({
                              ...newWork,
                              is_current: e.target.checked,
                              end_date: "",
                            })
                          }
                          className="rounded"
                        />
                        <span className="text-sm">{t("profile.currentlyWorking")}</span>
                      </label>
                      <Button
                        className="w-full"
                        onClick={handleAddWork}
                        disabled={
                          isCreatingWork ||
                          !newWork.company ||
                          !newWork.position ||
                          !newWork.start_date
                        }
                      >
                        {isCreatingWork ? t("common.saving") : t("common.save")}
                      </Button>
                    </div>
                  )}

                  {/* Work List — roadmap timeline */}
                  {isWorkExperiencesLoading ? (
                    <WorkExperienceSkeleton />
                  ) : workExperiences.length === 0 && !showAddWork ? (
                    <p className="text-muted-foreground text-center py-8">
                      {t("profile.noWorkExperience")}
                    </p>
                  ) : (
                    <div className="grid gap-3">
                      {sortedWorkExperiences.map((work) =>
                        editingWorkId === work.id ? (
                          <div
                            key={work.id}
                            className="p-4 border rounded-lg space-y-3 bg-muted/20"
                          >
                            <AutocompleteInput
                              placeholder={t("profile.companyNamePlaceholder")}
                              value={newWork.company}
                              onChange={(value) => setNewWork({ ...newWork, company: value })}
                              suggestions={COMPANIES_DB}
                              className="h-10"
                            />
                            <AutocompleteInput
                              placeholder={t("profile.position")}
                              value={newWork.position}
                              onChange={(value) => setNewWork({ ...newWork, position: value })}
                              suggestions={POSITIONS_DB}
                              className="h-10"
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">
                                  {t("profile.startDate")}
                                </label>
                                <Input
                                  type="month"
                                  value={newWork.start_date}
                                  onChange={(e) =>
                                    setNewWork({
                                      ...newWork,
                                      start_date: e.target.value,
                                    })
                                  }
                                  className="h-10"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">
                                  {t("profile.endDate")}
                                </label>
                                <Input
                                  type="month"
                                  value={newWork.end_date}
                                  onChange={(e) =>
                                    setNewWork({
                                      ...newWork,
                                      end_date: e.target.value,
                                    })
                                  }
                                  disabled={newWork.is_current}
                                  className="h-10"
                                />
                              </div>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newWork.is_current}
                                onChange={(e) =>
                                  setNewWork({
                                    ...newWork,
                                    is_current: e.target.checked,
                                    end_date: "",
                                  })
                                }
                                className="rounded"
                              />
                              <span className="text-sm">{t("profile.currentlyWorking")}</span>
                            </label>
                            <div className="flex gap-2">
                              <Button
                                className="flex-1"
                                onClick={handleSaveWork}
                                disabled={
                                  isUpdatingWork ||
                                  !newWork.company ||
                                  !newWork.position ||
                                  !newWork.start_date
                                }
                              >
                                {isUpdatingWork ? t("common.saving") : t("common.save")}
                              </Button>
                              <Button variant="outline" onClick={handleCancelEditWork}>
                                {t("common.cancel")}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div
                            key={work.id}
                            className={`relative pl-10 pr-4 py-3 rounded-xl group bg-muted/30 hover:bg-muted/50 transition-colors before:absolute before:left-4 before:-top-3 before:h-3 before:w-px before:bg-border first:before:hidden ${
                              work.is_current ? "ml-6 ring-1 ring-blue-500/30" : ""
                            }`}
                          >
                            {/* Timeline dot */}
                            <span className="absolute left-2.75 top-5 flex items-center justify-center">
                              {work.is_current && (
                                <span className="absolute inline-flex h-4 w-4 rounded-full bg-blue-500/40 animate-ping" />
                              )}
                              <span
                                className={`relative w-2.5 h-2.5 rounded-full ring-2 ring-background ${
                                  work.is_current ? "bg-blue-500" : "bg-foreground"
                                }`}
                              />
                            </span>
                            <div className="pr-20">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium">{work.position}</p>
                                {work.is_current && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-semibold uppercase tracking-wide">
                                    <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                                    Одоо
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{work.company}</p>
                              <p className="text-sm text-muted-foreground mt-1 tabular">
                                {formatWorkDate(
                                  new Date(work.start_date).toISOString().slice(0, 7)
                                )}{" "}
                                —{" "}
                                {work.is_current
                                  ? t("common.present")
                                  : work.end_date
                                    ? formatWorkDate(
                                        new Date(work.end_date).toISOString().slice(0, 7)
                                      )
                                    : ""}
                              </p>
                            </div>
                            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEditWork(work)}
                                className="p-2 rounded-md hover:bg-muted text-foreground"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteWork(work.id)}
                                disabled={isDeletingWork}
                                className="p-2 rounded-md hover:bg-muted text-destructive disabled:opacity-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal - Lazy loaded */}
      {showEditProfileModal && (
        <EditProfileModal open={showEditProfileModal} onOpenChange={setShowEditProfileModal} />
      )}
    </div>
  );
}
