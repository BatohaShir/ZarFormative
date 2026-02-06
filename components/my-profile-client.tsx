"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthModal } from "@/components/auth-modal";
import { FavoritesButton } from "@/components/favorites-button";
import { RequestsButton } from "@/components/requests-button";
import { NotificationsButton } from "@/components/notifications-button";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import {
  ChevronLeft,
  User,
  Star,
  ThumbsUp,
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
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { useEducations, type Education } from "@/hooks/use-educations";
import { useWorkExperiences, type WorkExperience } from "@/hooks/use-work-experiences";
// Realtime хук для автоматического обновления данных без перезагрузки страницы
import { useRealtimeProfile } from "@/hooks/use-realtime-profile";
// Skeleton компоненты для красивой загрузки
import { ProfileSkeleton, EducationSkeleton, WorkExperienceSkeleton } from "@/components/profile-skeleton";
// REMOVED: useFindManylisting_requests, useFindManyreviews - используем денормализованные данные из профиля
import {
  SCHOOLS_DB,
  COMPANIES_DB,
  POSITIONS_DB,
  DEGREES_DB,
  formatWorkDate,
} from "@/lib/data/suggestions";

// Lazy load EditProfileModal - not loaded until opened
const EditProfileModal = dynamic(
  () => import("@/components/edit-profile-modal").then((mod) => ({ default: mod.EditProfileModal })),
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

export function MyProfileClient() {
  const router = useRouter();
  const t = useTranslations();
  const { isAuthenticated, isLoading, user, profile, signOut, uploadAvatar, displayName, avatarUrl, updateProfile } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);

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

  // Education from database
  const {
    educations,
    isLoading: isEducationsLoading,
    createEducation,
    updateEducation,
    deleteEducation,
    isCreating: isCreatingEducation,
    isUpdating: isUpdatingEducation,
    isDeleting: isDeletingEducation,
  } = useEducations();

  const [showAddEducation, setShowAddEducation] = React.useState(false);
  const [editingEducationId, setEditingEducationId] = React.useState<string | null>(null);
  const [newEducation, setNewEducation] = React.useState<NewEducationForm>(initialEducationForm);

  // Work experience from database
  const {
    workExperiences,
    isLoading: isWorkExperiencesLoading,
    createWorkExperience,
    updateWorkExperience,
    deleteWorkExperience,
    isCreating: isCreatingWork,
    isUpdating: isUpdatingWork,
    isDeleting: isDeletingWork,
  } = useWorkExperiences();

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

  // Memoized sorted lists
  const sortedEducations = React.useMemo(() => {
    return [...educations].sort((a, b) =>
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );
  }, [educations]);

  const sortedWorkExperiences = React.useMemo(() => {
    return [...workExperiences].sort((a, b) =>
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );
  }, [workExperiences]);

  const handleLogout = React.useCallback(async () => {
    await signOut();
    router.push("/");
  }, [signOut, router]);

  const handleAvatarChange = React.useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploadingAvatar(true);
      try {
        await uploadAvatar(file);
        // Errors are handled by the uploadAvatar function (shows toast)
      } finally {
        setIsUploadingAvatar(false);
      }
    }
  }, [uploadAvatar]);

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

  const handleDeleteEducation = React.useCallback(async (id: string) => {
    await deleteEducation(id);
  }, [deleteEducation]);

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

  const handleDeleteWork = React.useCallback(async (id: string) => {
    await deleteWorkExperience(id);
  }, [deleteWorkExperience]);

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
                <span className="text-[#015197]">Tsogts</span>
                <span className="text-[#c4272f]">.mn</span>
              </h1>
            </Link>
          </div>
          {/* Mobile Nav */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <NotificationsButton />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              asChild
            >
              <Link href="/account/me/settings">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
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
        {/* Profile Header - Full Width with Better Avatar */}
        <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl p-6 md:p-8 mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full overflow-hidden ring-4 ring-white dark:ring-gray-800 shadow-xl">
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  width={160}
                  height={160}
                  unoptimized={avatarUrl.includes("dicebear")}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
              {isUploadingAvatar ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                  <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Camera className="h-8 w-8 text-white" />
                </button>
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
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2">
                {displayName}
              </h2>
              <p className="text-muted-foreground mb-4">{user?.email}</p>

              {/* Stats - Horizontal on all screens */}
              <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-6">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 rounded-full">
                  <Star className="h-5 w-5 text-yellow-500 fill-current" />
                  <span className="font-bold text-lg">{averageRating > 0 ? averageRating : "-"}</span>
                  <span className="text-sm text-muted-foreground">{t("profile.rating")}{reviewCount > 0 ? ` (${reviewCount})` : ""}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 rounded-full">
                  <ThumbsUp className="h-5 w-5 text-green-500" />
                  <span className="font-bold text-lg">{completedCount}</span>
                  <span className="text-sm text-muted-foreground">{t("profile.completedJobs")}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 rounded-full">
                  <ThumbsDown className="h-5 w-5 text-red-500" />
                  <span className="font-bold text-lg">{failedCount}</span>
                  <span className="text-sm text-muted-foreground">{t("profile.failedJobs")}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions - Desktop */}
            <div className="hidden lg:flex flex-col gap-2">
              <Button variant="default" className="gap-2" asChild>
                <Link href="/account/me/services">
                  <Package className="h-4 w-4" />
                  {t("profile.myServices")}
                </Link>
              </Button>
              <Button variant="outline" className="gap-2" asChild>
                <Link href="/account/me/settings">
                  <Settings className="h-4 w-4" />
                  {t("profile.appSettings")}
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setShowEditProfileModal(true)} className="gap-2">
                <Pencil className="h-4 w-4" />
                {t("common.edit")}
              </Button>
            </div>
          </div>
        </div>

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
                        <p className="text-xs text-muted-foreground">{t("profile.registrationNumber")}</p>
                        <p className="font-medium truncate">{profile?.registration_number || "-"}</p>
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
                      <span className="text-xs text-muted-foreground">
                        {aboutText.length}/500
                      </span>
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

            {/* Mobile Action Buttons */}
            <div className="lg:hidden space-y-2">
              <Button
                className="w-full gap-2"
                asChild
              >
                <Link href="/account/me/services">
                  <Package className="h-4 w-4" />
                  {t("profile.myServices")}
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setShowEditProfileModal(true)}
              >
                <Pencil className="h-4 w-4" />
                {t("common.edit")}
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                asChild
              >
                <Link href="/account/me/settings">
                  <Settings className="h-4 w-4" />
                  {t("profile.appSettings")}
                </Link>
              </Button>
            </div>
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
                      <span className="text-xs text-muted-foreground">
                        {aboutText.length}/1000
                      </span>
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

                  {/* Education List */}
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
                            <div
                              key={edu.id}
                              className="p-4 border rounded-lg space-y-3 bg-muted/20"
                            >
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
                                <Button
                                  variant="outline"
                                  onClick={handleCancelEditEducation}
                                >
                                  {t("common.cancel")}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div
                              key={edu.id}
                              className="p-4 bg-muted/30 rounded-lg group relative hover:bg-muted/50 transition-colors"
                            >
                              <div className="pr-20">
                                <p className="font-medium">{edu.degree}</p>
                                <p className="text-sm text-muted-foreground">
                                  {edu.institution}
                                </p>
                                {edu.field_of_study && (
                                  <p className="text-sm text-muted-foreground">
                                    {edu.field_of_study}
                                  </p>
                                )}
                                <p className="text-sm text-muted-foreground mt-1">
                                  {formatWorkDate(new Date(edu.start_date).toISOString().slice(0, 7))} -{" "}
                                  {edu.is_current
                                    ? t("common.present")
                                    : edu.end_date ? formatWorkDate(new Date(edu.end_date).toISOString().slice(0, 7)) : ""}
                                </p>
                              </div>
                              <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleEditEducation(edu)}
                                  className="p-2 rounded-md hover:bg-blue-100 dark:hover:bg-blue-950/50 text-blue-500"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEducation(edu.id)}
                                  disabled={isDeletingEducation}
                                  className="p-2 rounded-md hover:bg-red-100 dark:hover:bg-red-950/50 text-red-500 disabled:opacity-50"
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
                        onChange={(value) =>
                          setNewWork({ ...newWork, position: value })
                        }
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
                              setNewWork({ ...newWork, start_date: e.target.value })
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
                              setNewWork({ ...newWork, end_date: e.target.value })
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

                  {/* Work List */}
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
                                onChange={(value) =>
                                  setNewWork({ ...newWork, company: value })
                                }
                                suggestions={COMPANIES_DB}
                                className="h-10"
                              />
                              <AutocompleteInput
                                placeholder={t("profile.position")}
                                value={newWork.position}
                                onChange={(value) =>
                                  setNewWork({ ...newWork, position: value })
                                }
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
                                <Button
                                  variant="outline"
                                  onClick={handleCancelEditWork}
                                >
                                  {t("common.cancel")}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div
                              key={work.id}
                              className="p-4 bg-muted/30 rounded-lg group relative hover:bg-muted/50 transition-colors"
                            >
                              <div className="pr-20">
                                <p className="font-medium">{work.position}</p>
                                <p className="text-sm text-muted-foreground">
                                  {work.company}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {formatWorkDate(new Date(work.start_date).toISOString().slice(0, 7))} -{" "}
                                  {work.is_current
                                    ? t("common.present")
                                    : work.end_date ? formatWorkDate(new Date(work.end_date).toISOString().slice(0, 7)) : ""}
                                </p>
                              </div>
                              <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleEditWork(work)}
                                  className="p-2 rounded-md hover:bg-blue-100 dark:hover:bg-blue-950/50 text-blue-500"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteWork(work.id)}
                                  disabled={isDeletingWork}
                                  className="p-2 rounded-md hover:bg-red-100 dark:hover:bg-red-950/50 text-red-500 disabled:opacity-50"
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
        <EditProfileModal
          open={showEditProfileModal}
          onOpenChange={setShowEditProfileModal}
        />
      )}
    </div>
  );
}
