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
  LogOut,
  Moon,
  Sun,
  Star,
  ThumbsUp,
  ThumbsDown,
  Mail,
  Phone,
  Cake,
  Calendar,
  Pencil,
  Save,
  GraduationCap,
  Briefcase,
  Plus,
  Trash2,
  Camera,
  X,
  Bell,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "next-themes";
import { LoginPromptModal } from "@/components/login-prompt-modal";

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

interface Education {
  id: number;
  school: string;
  degree: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

interface WorkExperience {
  id: number;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export default function MyProfilePage() {
  const router = useRouter();
  const { isAuthenticated, user, profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Profile editing state
  const [isEditing, setIsEditing] = React.useState(false);

  // Get display name from profile or user email
  const displayName = profile
    ? profile.is_company
      ? profile.company_name || "Компани"
      : `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Хэрэглэгч"
    : user?.email?.split("@")[0] || "Хэрэглэгч";

  const avatarUrl = profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`;

  // Education state
  const [educations, setEducations] = React.useState<Education[]>([
    {
      id: 1,
      school: "МУИС",
      degree: "Компьютерийн ухаан, Бакалавр",
      startDate: "2015-09",
      endDate: "2019-06",
      isCurrent: false,
    },
  ]);
  const [showAddEducation, setShowAddEducation] = React.useState(false);
  const [editingEducationId, setEditingEducationId] = React.useState<
    number | null
  >(null);
  const [newEducation, setNewEducation] = React.useState<Omit<Education, "id">>(
    {
      school: "",
      degree: "",
      startDate: "",
      endDate: "",
      isCurrent: false,
    }
  );

  // Work experience state
  const [workExperiences, setWorkExperiences] = React.useState<
    WorkExperience[]
  >([
    {
      id: 1,
      company: "Голомт банк",
      position: "Програм хангамжийн инженер",
      startDate: "2021-03",
      endDate: "",
      isCurrent: true,
    },
    {
      id: 2,
      company: "Монгол Пост",
      position: "IT мэргэжилтэн",
      startDate: "2019-06",
      endDate: "2021-02",
      isCurrent: false,
    },
  ]);
  const [showAddWork, setShowAddWork] = React.useState(false);
  const [editingWorkId, setEditingWorkId] = React.useState<number | null>(null);
  const [newWork, setNewWork] = React.useState<Omit<WorkExperience, "id">>({
    company: "",
    position: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
  });

  React.useEffect(() => {
    setMounted(true);
  }, []);

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

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
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

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // TODO: Upload avatar to Supabase Storage
      console.log("Avatar upload not implemented yet:", file.name);
    }
  };

  // Education handlers
  const handleAddEducation = () => {
    if (educations.length >= 5) return;
    if (
      !newEducation.school ||
      !newEducation.degree ||
      !newEducation.startDate
    )
      return;

    setEducations([...educations, { ...newEducation, id: Date.now() }]);
    setNewEducation({
      school: "",
      degree: "",
      startDate: "",
      endDate: "",
      isCurrent: false,
    });
    setShowAddEducation(false);
  };

  const handleEditEducation = (edu: Education) => {
    setEditingEducationId(edu.id);
    setNewEducation({
      school: edu.school,
      degree: edu.degree,
      startDate: edu.startDate,
      endDate: edu.endDate,
      isCurrent: edu.isCurrent,
    });
  };

  const handleSaveEducation = () => {
    if (
      !newEducation.school ||
      !newEducation.degree ||
      !newEducation.startDate
    )
      return;

    setEducations(
      educations.map((edu) =>
        edu.id === editingEducationId ? { ...newEducation, id: edu.id } : edu
      )
    );
    setEditingEducationId(null);
    setNewEducation({
      school: "",
      degree: "",
      startDate: "",
      endDate: "",
      isCurrent: false,
    });
  };

  const handleCancelEditEducation = () => {
    setEditingEducationId(null);
    setNewEducation({
      school: "",
      degree: "",
      startDate: "",
      endDate: "",
      isCurrent: false,
    });
  };

  const handleDeleteEducation = (id: number) => {
    setEducations(educations.filter((e) => e.id !== id));
  };

  // Work experience handlers
  const handleAddWork = () => {
    if (workExperiences.length >= 5) return;
    if (!newWork.company || !newWork.position || !newWork.startDate) return;

    setWorkExperiences([...workExperiences, { ...newWork, id: Date.now() }]);
    setNewWork({
      company: "",
      position: "",
      startDate: "",
      endDate: "",
      isCurrent: false,
    });
    setShowAddWork(false);
  };

  const handleEditWork = (work: WorkExperience) => {
    setEditingWorkId(work.id);
    setNewWork({
      company: work.company,
      position: work.position,
      startDate: work.startDate,
      endDate: work.endDate,
      isCurrent: work.isCurrent,
    });
  };

  const handleSaveWork = () => {
    if (!newWork.company || !newWork.position || !newWork.startDate) return;

    setWorkExperiences(
      workExperiences.map((work) =>
        work.id === editingWorkId ? { ...newWork, id: work.id } : work
      )
    );
    setEditingWorkId(null);
    setNewWork({
      company: "",
      position: "",
      startDate: "",
      endDate: "",
      isCurrent: false,
    });
  };

  const handleCancelEditWork = () => {
    setEditingWorkId(null);
    setNewWork({
      company: "",
      position: "",
      startDate: "",
      endDate: "",
      isCurrent: false,
    });
  };

  const handleDeleteWork = (id: number) => {
    setWorkExperiences(workExperiences.filter((w) => w.id !== id));
  };

  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen bg-background pb-20 md:pb-0 flex items-center justify-center">
          <div className="text-center">
            <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Нэвтэрнэ үү</h2>
            <p className="text-muted-foreground mb-4">
              Профайл харахын тулд нэвтэрнэ үү
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
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="h-8 w-8 text-white" />
              </button>
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
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} className="gap-2">
                  <Pencil className="h-4 w-4" />
                  Засварлах
                </Button>
              ) : (
                <Button onClick={() => setIsEditing(false)} className="gap-2">
                  <Save className="h-4 w-4" />
                  Хадгалах
                </Button>
              )}
              <Button variant="outline" onClick={toggleTheme} className="gap-2">
                {mounted && theme === "dark" ? (
                  <>
                    <Sun className="h-4 w-4" />
                    Цагаан горим
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4" />
                    Хар горим
                  </>
                )}
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
                <User className="h-5 w-5 text-primary" />
                Хувийн мэдээлэл
              </h3>

              <div className="space-y-4">
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

            {/* Mobile Action Buttons */}
            <div className="lg:hidden space-y-2">
              {!isEditing ? (
                <Button
                  className="w-full gap-2"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-4 w-4" />
                  Засварлах
                </Button>
              ) : (
                <Button
                  className="w-full gap-2"
                  onClick={() => setIsEditing(false)}
                >
                  <Save className="h-4 w-4" />
                  Хадгалах
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={toggleTheme}
              >
                {mounted && theme === "dark" ? (
                  <>
                    <Sun className="h-4 w-4" />
                    Цагаан горим
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4" />
                    Хар горим
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                asChild
              >
                <Link href="/account/notifications">
                  <Bell className="h-4 w-4" />
                  Мэдэгдлийн тохиргоо
                </Link>
              </Button>
            </div>
          </div>

          {/* Right Column - Education & Work */}
          <div className="lg:col-span-2 space-y-6">
            {/* Education */}
            <div className="bg-card rounded-xl border p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Боловсрол
                </h3>
                {educations.length < 5 && !showAddEducation && (
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
                        setNewEducation({
                          school: "",
                          degree: "",
                          startDate: "",
                          endDate: "",
                          isCurrent: false,
                        });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <AutocompleteInput
                    placeholder="Сургуулийн нэр"
                    value={newEducation.school}
                    onChange={(value) =>
                      setNewEducation({ ...newEducation, school: value })
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Эхэлсэн
                      </label>
                      <Input
                        type="month"
                        value={newEducation.startDate}
                        onChange={(e) =>
                          setNewEducation({
                            ...newEducation,
                            startDate: e.target.value,
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
                        value={newEducation.endDate}
                        onChange={(e) =>
                          setNewEducation({
                            ...newEducation,
                            endDate: e.target.value,
                          })
                        }
                        disabled={newEducation.isCurrent}
                        className="h-10"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newEducation.isCurrent}
                      onChange={(e) =>
                        setNewEducation({
                          ...newEducation,
                          isCurrent: e.target.checked,
                          endDate: "",
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
                      !newEducation.school ||
                      !newEducation.degree ||
                      !newEducation.startDate
                    }
                  >
                    Хадгалах
                  </Button>
                </div>
              )}

              {/* Education List */}
              {educations.length === 0 && !showAddEducation ? (
                <p className="text-muted-foreground text-center py-8">
                  Боловсролын мэдээлэл нэмээгүй байна
                </p>
              ) : (
                <div className="grid gap-3">
                  {[...educations]
                    .sort((a, b) => b.startDate.localeCompare(a.startDate))
                    .map((edu) =>
                      editingEducationId === edu.id ? (
                        <div
                          key={edu.id}
                          className="p-4 border rounded-lg space-y-3 bg-muted/20"
                        >
                          <AutocompleteInput
                            placeholder="Сургуулийн нэр"
                            value={newEducation.school}
                            onChange={(value) =>
                              setNewEducation({ ...newEducation, school: value })
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
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">
                                Эхэлсэн
                              </label>
                              <Input
                                type="month"
                                value={newEducation.startDate}
                                onChange={(e) =>
                                  setNewEducation({
                                    ...newEducation,
                                    startDate: e.target.value,
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
                                value={newEducation.endDate}
                                onChange={(e) =>
                                  setNewEducation({
                                    ...newEducation,
                                    endDate: e.target.value,
                                  })
                                }
                                disabled={newEducation.isCurrent}
                                className="h-10"
                              />
                            </div>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newEducation.isCurrent}
                              onChange={(e) =>
                                setNewEducation({
                                  ...newEducation,
                                  isCurrent: e.target.checked,
                                  endDate: "",
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
                                !newEducation.school ||
                                !newEducation.degree ||
                                !newEducation.startDate
                              }
                            >
                              Хадгалах
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
                              {edu.school}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {formatWorkDate(edu.startDate)} -{" "}
                              {edu.isCurrent
                                ? "Одоог хүртэл"
                                : formatWorkDate(edu.endDate)}
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
                              className="p-2 rounded-md hover:bg-red-100 dark:hover:bg-red-950/50 text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )
                    )}
                </div>
              )}

              {educations.length > 0 && (
                <p className="text-xs text-muted-foreground text-center mt-4">
                  {educations.length}/5 боловсрол
                </p>
              )}
            </div>

            {/* Work Experience */}
            <div className="bg-card rounded-xl border p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Ажлын туршлага
                </h3>
                {workExperiences.length < 5 && !showAddWork && (
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
                        setNewWork({
                          company: "",
                          position: "",
                          startDate: "",
                          endDate: "",
                          isCurrent: false,
                        });
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
                        value={newWork.startDate}
                        onChange={(e) =>
                          setNewWork({ ...newWork, startDate: e.target.value })
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
                        value={newWork.endDate}
                        onChange={(e) =>
                          setNewWork({ ...newWork, endDate: e.target.value })
                        }
                        disabled={newWork.isCurrent}
                        className="h-10"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newWork.isCurrent}
                      onChange={(e) =>
                        setNewWork({
                          ...newWork,
                          isCurrent: e.target.checked,
                          endDate: "",
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
                      !newWork.company || !newWork.position || !newWork.startDate
                    }
                  >
                    Хадгалах
                  </Button>
                </div>
              )}

              {/* Work List */}
              {workExperiences.length === 0 && !showAddWork ? (
                <p className="text-muted-foreground text-center py-8">
                  Ажлын туршлага нэмээгүй байна
                </p>
              ) : (
                <div className="grid gap-3">
                  {[...workExperiences]
                    .sort((a, b) => b.startDate.localeCompare(a.startDate))
                    .map((work) =>
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
                                value={newWork.startDate}
                                onChange={(e) =>
                                  setNewWork({
                                    ...newWork,
                                    startDate: e.target.value,
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
                                value={newWork.endDate}
                                onChange={(e) =>
                                  setNewWork({
                                    ...newWork,
                                    endDate: e.target.value,
                                  })
                                }
                                disabled={newWork.isCurrent}
                                className="h-10"
                              />
                            </div>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newWork.isCurrent}
                              onChange={(e) =>
                                setNewWork({
                                  ...newWork,
                                  isCurrent: e.target.checked,
                                  endDate: "",
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
                                !newWork.company ||
                                !newWork.position ||
                                !newWork.startDate
                              }
                            >
                              Хадгалах
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
                              {formatWorkDate(work.startDate)} -{" "}
                              {work.isCurrent
                                ? "Одоог хүртэл"
                                : formatWorkDate(work.endDate)}
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
                              className="p-2 rounded-md hover:bg-red-100 dark:hover:bg-red-950/50 text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )
                    )}
                </div>
              )}

              {workExperiences.length > 0 && (
                <p className="text-xs text-muted-foreground text-center mt-4">
                  {workExperiences.length}/5 ажлын туршлага
                </p>
              )}
            </div>
          </div>
        </div>

        {/* App Info */}
        <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
          <p>Uilchilgee.mn v1.0.0</p>
          <p className="mt-1">© 2024 Бүх эрх хуулиар хамгаалагдсан</p>
        </div>
      </div>
    </div>
  );
}
