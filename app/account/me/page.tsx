"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthModal } from "@/components/auth-modal";
import { FavoritesButton } from "@/components/favorites-button";
import { RequestsButton } from "@/components/requests-button";
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
  Bell,
  FileText,
  Check,
  Building2,
  Hash,
  Settings,
  Package,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { EditProfileModal } from "@/components/edit-profile-modal";
import { useEducations, type Education } from "@/hooks/use-educations";
import { useWorkExperiences, type WorkExperience } from "@/hooks/use-work-experiences";

// Mock данные - потом будут из БД
const SCHOOLS_DB = [
  "МУИС",
  "ШУТИС",
  "ХААИС",
  "МУБИС",
  "СУИС",
  "Отгонтэнгэр их сургууль",
  "Монгол Улсын Их Сургууль",
  "Шинжлэх Ухаан Технологийн Их Сургууль",
  "Хөдөө Аж Ахуйн Их Сургууль",
  "Боловсролын Их Сургууль",
];

const COMPANIES_DB = [
  "Голомт банк",
  "Хаан банк",
  "Худалдаа хөгжлийн банк",
  "Төрийн банк",
  "Монгол Пост",
  "МЦС",
  "Юнител",
  "Скайтел",
  "Оюу Толгой",
  "Эрдэнэт үйлдвэр",
];

const POSITIONS_DB = [
  "Програм хангамжийн инженер",
  "IT мэргэжилтэн",
  "Веб хөгжүүлэгч",
  "Мобайл хөгжүүлэгч",
  "Дата шинжээч",
  "Систем администратор",
  "Төслийн менежер",
  "UI/UX дизайнер",
];

const DEGREES_DB = [
  "Бакалавр",
  "Магистр",
  "Доктор",
  "Дипломын",
  "Мэргэжлийн",
];

// Autocomplete Input Component
interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder: string;
  className?: string;
}

function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
  className,
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = React.useState<
    string[]
  >([]);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (value.length > 0) {
      const filtered = suggestions
        .filter((s) => s.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 5);
      setFilteredSuggestions(filtered);
      setIsOpen(filtered.length > 0 && !suggestions.includes(value));
    } else {
      setFilteredSuggestions([]);
      setIsOpen(false);
    }
  }, [value, suggestions]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        onFocus={() => {
          if (filteredSuggestions.length > 0 && !suggestions.includes(value)) {
            setIsOpen(true);
          }
        }}
      />
      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-40 overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
              onClick={() => {
                onChange(suggestion);
                setIsOpen(false);
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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

export default function MyProfilePage() {
  const router = useRouter();
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
  const [newEducation, setNewEducation] = React.useState<NewEducationForm>({
    institution: "",
    degree: "",
    field_of_study: "",
    start_date: "",
    end_date: "",
    is_current: false,
  });

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
  const [newWork, setNewWork] = React.useState<NewWorkExperienceForm>({
    company: "",
    position: "",
    start_date: "",
    end_date: "",
    is_current: false,
  });

  // Redirect to home if not authenticated
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isLoading, isAuthenticated, router]);

  // Мемоизированные отсортированные списки - предотвращает лишние вычисления при ререндере
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

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  const formatWorkDate = (dateStr: string) => {
    if (!dateStr) return "Одоог хүртэл";
    const [year, month] = dateStr.split("-");
    const months = [
      "1-р сар",
      "2-р сар",
      "3-р сар",
      "4-р сар",
      "5-р сар",
      "6-р сар",
      "7-р сар",
      "8-р сар",
      "9-р сар",
      "10-р сар",
      "11-р сар",
      "12-р сар",
    ];
    return `${year} оны ${months[parseInt(month) - 1]}`;
  };

  const formatBirthDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${year} оны ${parseInt(month)}-р сарын ${parseInt(day)}`;
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploadingAvatar(true);
      try {
        const { error } = await uploadAvatar(file);
        if (error) {
          console.error("Avatar upload error:", error);
        }
      } finally {
        setIsUploadingAvatar(false);
      }
    }
  };

  // Education handlers
  const resetEducationForm = () => {
    setNewEducation({
      institution: "",
      degree: "",
      field_of_study: "",
      start_date: "",
      end_date: "",
      is_current: false,
    });
  };

  const handleAddEducation = async () => {
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
  };

  const handleEditEducation = (edu: Education) => {
    setEditingEducationId(edu.id);
    setNewEducation({
      institution: edu.institution,
      degree: edu.degree,
      field_of_study: edu.field_of_study || "",
      start_date: edu.start_date ? new Date(edu.start_date).toISOString().slice(0, 7) : "",
      end_date: edu.end_date ? new Date(edu.end_date).toISOString().slice(0, 7) : "",
      is_current: edu.is_current,
    });
  };

  const handleSaveEducation = async () => {
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
  };

  const handleCancelEditEducation = () => {
    setEditingEducationId(null);
    resetEducationForm();
  };

  const handleDeleteEducation = async (id: string) => {
    await deleteEducation(id);
  };

  // Work experience handlers
  const resetWorkForm = () => {
    setNewWork({
      company: "",
      position: "",
      start_date: "",
      end_date: "",
      is_current: false,
    });
  };

  const handleAddWork = async () => {
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
  };

  const handleEditWork = (work: WorkExperience) => {
    setEditingWorkId(work.id);
    setNewWork({
      company: work.company,
      position: work.position,
      start_date: work.start_date ? new Date(work.start_date).toISOString().slice(0, 7) : "",
      end_date: work.end_date ? new Date(work.end_date).toISOString().slice(0, 7) : "",
      is_current: work.is_current,
    });
  };

  const handleSaveWork = async () => {
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
  };

  const handleCancelEditWork = () => {
    setEditingWorkId(null);
    resetWorkForm();
  };

  const handleDeleteWork = async (id: string) => {
    await deleteWorkExperience(id);
  };

  // About handlers
  const handleSaveAbout = async () => {
    setIsSavingAbout(true);
    try {
      const { error } = await updateProfile({ about: aboutText.trim() || null });
      if (!error) {
        setIsEditingAbout(false);
      }
    } finally {
      setIsSavingAbout(false);
    }
  };

  const handleDeleteAbout = async () => {
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
  };

  const handleCancelAbout = () => {
    setAboutText(profile?.about || "");
    setIsEditingAbout(false);
  };

  // Show loading or redirect is in progress
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
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
                <span className="text-[#c4272f]">Uilc</span>
                <span className="text-[#015197]">hilge</span>
                <span className="text-[#c4272f]">e.mn</span>
              </h1>
            </Link>
          </div>
          {/* Mobile Settings Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8"
            asChild
          >
            <Link href="/account/me/settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
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
        {/* Profile Header - Full Width with Better Avatar */}
        <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl p-6 md:p-8 mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full overflow-hidden ring-4 ring-white dark:ring-gray-800 shadow-xl">
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
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
                  <span className="font-bold text-lg">4.9</span>
                  <span className="text-sm text-muted-foreground">Үнэлгээ</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 rounded-full">
                  <ThumbsUp className="h-5 w-5 text-green-500" />
                  <span className="font-bold text-lg">127</span>
                  <span className="text-sm text-muted-foreground">Амжилттай</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 rounded-full">
                  <ThumbsDown className="h-5 w-5 text-red-500" />
                  <span className="font-bold text-lg">2</span>
                  <span className="text-sm text-muted-foreground">Амжилтгүй</span>
                </div>
              </div>
            </div>

            {/* Quick Actions - Desktop */}
            <div className="hidden lg:flex flex-col gap-2">
              <Button variant="default" className="gap-2" asChild>
                <Link href="/account/me/services">
                  <Package className="h-4 w-4" />
                  Миний үйлчилгээнүүд
                </Link>
              </Button>
              <Button variant="outline" className="gap-2" asChild>
                <Link href="/account/me/settings">
                  <Settings className="h-4 w-4" />
                  Апп тохиргоо
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setShowEditProfileModal(true)} className="gap-2">
                <Pencil className="h-4 w-4" />
                Засварлах
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
                {profile?.is_company ? "Компанийн мэдээлэл" : "Хувийн мэдээлэл"}
              </h3>

              <div className="space-y-4">
                {profile?.is_company ? (
                  <>
                    <div className="flex items-start gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Нэр</p>
                        <p className="font-medium truncate">{profile?.company_name || "-"}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Hash className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Регистрийн дугаар</p>
                        <p className="font-medium truncate">{profile?.registration_number || "-"}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Нэр</p>
                        <p className="font-medium truncate">{profile?.first_name || "-"}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Овог</p>
                        <p className="font-medium truncate">{profile?.last_name || "-"}</p>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Имэйл</p>
                    <p className="font-medium truncate">{user?.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Утас</p>
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
                    О себе
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
                          Засварлах
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Нэмэх
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {isEditingAbout ? (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Өөрийнхөө тухай бичнэ үү..."
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
                            Устгах
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelAbout}
                          disabled={isSavingAbout}
                        >
                          Болих
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveAbout}
                          disabled={isSavingAbout || !aboutText.trim()}
                        >
                          {isSavingAbout ? (
                            "Хадгалж байна..."
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Хадгалах
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
                    Өөрийнхөө тухай мэдээлэл нэмээгүй байна
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
                  Миний үйлчилгээнүүд
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setShowEditProfileModal(true)}
              >
                <Pencil className="h-4 w-4" />
                Засварлах
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                asChild
              >
                <Link href="/account/me/notifications">
                  <Bell className="h-4 w-4" />
                  Мэдэгдлийн тохиргоо
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
                    О компании
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
                          Засварлах
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Нэмэх
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {isEditingAbout ? (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Компанийнхаа тухай бичнэ үү..."
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
                            Устгах
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelAbout}
                          disabled={isSavingAbout}
                        >
                          Болих
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveAbout}
                          disabled={isSavingAbout || !aboutText.trim()}
                        >
                          {isSavingAbout ? (
                            "Хадгалж байна..."
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Хадгалах
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
                    Компанийн тухай мэдээлэл нэмээгүй байна
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
                      Боловсрол
                    </h3>
                    {!showAddEducation && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => setShowAddEducation(true)}
                      >
                        <Plus className="h-4 w-4" />
                        Нэмэх
                      </Button>
                    )}
                  </div>

                  {/* Add Education Form */}
                  {showAddEducation && (
                    <div className="p-4 border rounded-lg space-y-3 bg-muted/20 mb-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Шинэ боловсрол нэмэх</h4>
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
                        placeholder="Сургуулийн нэр"
                        value={newEducation.institution}
                        onChange={(value) =>
                          setNewEducation({ ...newEducation, institution: value })
                        }
                        suggestions={SCHOOLS_DB}
                        className="h-10"
                      />
                      <AutocompleteInput
                        placeholder="Мэргэжил, зэрэг"
                        value={newEducation.degree}
                        onChange={(value) =>
                          setNewEducation({ ...newEducation, degree: value })
                        }
                        suggestions={DEGREES_DB}
                        className="h-10"
                      />
                      <Input
                        placeholder="Чиглэл/Мэргэжил (заавал биш)"
                        value={newEducation.field_of_study}
                        onChange={(e) =>
                          setNewEducation({ ...newEducation, field_of_study: e.target.value })
                        }
                        className="h-10"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">
                            Эхэлсэн
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
                            Төгссөн
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
                        <span className="text-sm">Одоо суралцаж байгаа</span>
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
                        {isCreatingEducation ? "Хадгалж байна..." : "Хадгалах"}
                      </Button>
                    </div>
                  )}

                  {/* Education List */}
                  {isEducationsLoading ? (
                    <div className="grid gap-3">
                      {[1, 2].map((i) => (
                        <div key={i} className="p-4 bg-muted/30 rounded-lg animate-pulse">
                          <div className="h-5 bg-muted rounded w-1/3 mb-2" />
                          <div className="h-4 bg-muted rounded w-1/2 mb-1" />
                          <div className="h-4 bg-muted rounded w-2/5 mt-2" />
                        </div>
                      ))}
                    </div>
                  ) : educations.length === 0 && !showAddEducation ? (
                    <p className="text-muted-foreground text-center py-8">
                      Боловсролын мэдээлэл нэмээгүй байна
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
                                placeholder="Сургуулийн нэр"
                                value={newEducation.institution}
                                onChange={(value) =>
                                  setNewEducation({ ...newEducation, institution: value })
                                }
                                suggestions={SCHOOLS_DB}
                                className="h-10"
                              />
                              <AutocompleteInput
                                placeholder="Мэргэжил, зэрэг"
                                value={newEducation.degree}
                                onChange={(value) =>
                                  setNewEducation({ ...newEducation, degree: value })
                                }
                                suggestions={DEGREES_DB}
                                className="h-10"
                              />
                              <Input
                                placeholder="Чиглэл/Мэргэжил (заавал биш)"
                                value={newEducation.field_of_study}
                                onChange={(e) =>
                                  setNewEducation({ ...newEducation, field_of_study: e.target.value })
                                }
                                className="h-10"
                              />
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">
                                    Эхэлсэн
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
                                    Төгссөн
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
                                <span className="text-sm">Одоо суралцаж байгаа</span>
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
                                  {isUpdatingEducation ? "Хадгалж байна..." : "Хадгалах"}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={handleCancelEditEducation}
                                >
                                  Болих
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
                                    ? "Одоог хүртэл"
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
                      Ажлын туршлага
                    </h3>
                    {!showAddWork && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => setShowAddWork(true)}
                      >
                        <Plus className="h-4 w-4" />
                        Нэмэх
                      </Button>
                    )}
                  </div>

                  {/* Add Work Form */}
                  {showAddWork && (
                    <div className="p-4 border rounded-lg space-y-3 bg-muted/20 mb-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Шинэ ажлын туршлага нэмэх</h4>
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
                        placeholder="Байгууллагын нэр"
                        value={newWork.company}
                        onChange={(value) => setNewWork({ ...newWork, company: value })}
                        suggestions={COMPANIES_DB}
                        className="h-10"
                      />
                      <AutocompleteInput
                        placeholder="Албан тушаал"
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
                            Эхэлсэн
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
                            Дууссан
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
                        <span className="text-sm">Одоо ажиллаж байгаа</span>
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
                        {isCreatingWork ? "Хадгалж байна..." : "Хадгалах"}
                      </Button>
                    </div>
                  )}

                  {/* Work List */}
                  {isWorkExperiencesLoading ? (
                    <div className="grid gap-3">
                      {[1, 2].map((i) => (
                        <div key={i} className="p-4 bg-muted/30 rounded-lg animate-pulse">
                          <div className="h-5 bg-muted rounded w-2/5 mb-2" />
                          <div className="h-4 bg-muted rounded w-1/3 mb-1" />
                          <div className="h-4 bg-muted rounded w-2/5 mt-2" />
                        </div>
                      ))}
                    </div>
                  ) : workExperiences.length === 0 && !showAddWork ? (
                    <p className="text-muted-foreground text-center py-8">
                      Ажлын туршлага нэмээгүй байна
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
                                placeholder="Байгууллагын нэр"
                                value={newWork.company}
                                onChange={(value) =>
                                  setNewWork({ ...newWork, company: value })
                                }
                                suggestions={COMPANIES_DB}
                                className="h-10"
                              />
                              <AutocompleteInput
                                placeholder="Албан тушаал"
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
                                    Эхэлсэн
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
                                    Дууссан
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
                                <span className="text-sm">Одоо ажиллаж байгаа</span>
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
                                  {isUpdatingWork ? "Хадгалж байна..." : "Хадгалах"}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={handleCancelEditWork}
                                >
                                  Болих
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
                                    ? "Одоог хүртэл"
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

      {/* Edit Profile Modal */}
      <EditProfileModal
        open={showEditProfileModal}
        onOpenChange={setShowEditProfileModal}
      />
    </div>
  );
}
