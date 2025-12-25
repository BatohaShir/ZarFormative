"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Mail, User, Lock, Eye, EyeOff, LogOut, UserCircle, Star, ThumbsUp, ThumbsDown, Calendar, Pencil, Save, Briefcase, Plus, Trash2, GraduationCap, Cake } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

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
  "Соёл Урлагийн Их Сургууль",
  "Эрүүл Мэндийн Шинжлэх Ухааны Их Сургууль",
  "Батлан хамгаалахын их сургууль",
  "Хүмүүнлэгийн Ухааны Их Сургууль",
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
  "Жи Мобайл",
  "Оюу Толгой",
  "Эрдэнэт үйлдвэр",
  "Таван Толгой",
  "МАК",
  "Монголын Төмөр Зам",
  "МИАТ",
  "APU",
  "Шунхлай групп",
  "Монос групп",
  "Номин холдинг",
  "И-Март",
  "Nomin Foods",
];

const POSITIONS_DB = [
  "Програм хангамжийн инженер",
  "IT мэргэжилтэн",
  "Веб хөгжүүлэгч",
  "Мобайл хөгжүүлэгч",
  "Дата шинжээч",
  "Систем администратор",
  "Төслийн менежер",
  "Бизнес шинжээч",
  "UI/UX дизайнер",
  "Маркетингийн менежер",
  "Борлуулалтын менежер",
  "Нягтлан бодогч",
  "Хүний нөөцийн менежер",
  "Санхүүгийн шинжээч",
  "Үйлдвэрлэлийн инженер",
];

const DEGREES_DB = [
  "Бакалавр",
  "Магистр",
  "Доктор",
  "Дипломын",
  "Мэргэжлийн",
  "Компьютерийн ухаан",
  "Мэдээллийн технологи",
  "Программ хангамж",
  "Бизнесийн удирдлага",
  "Маркетинг",
  "Санхүү",
  "Нягтлан бодох бүртгэл",
  "Эдийн засаг",
  "Хууль зүй",
];

// Autocomplete Input Component
interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder: string;
  className?: string;
}

function AutocompleteInput({ value, onChange, suggestions, placeholder, className }: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = React.useState<string[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (value.length > 0) {
      const filtered = suggestions.filter(s =>
        s.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      setFilteredSuggestions(filtered);
      setIsOpen(filtered.length > 0 && !suggestions.includes(value));
    } else {
      setFilteredSuggestions([]);
      setIsOpen(false);
    }
  }, [value, suggestions]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
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

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function AuthModal() {
  const { user, login, logout, updateAvatar, isAuthenticated } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [phoneStep, setPhoneStep] = React.useState<"phone" | "code">("phone");
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");

  const resetState = () => {
    setPhoneStep("phone");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setEmail("");
    setPassword("");
    setError("");
  };

  const handleLogin = () => {
    if (!email || !password) {
      setError("Имэйл болон нууц үгээ оруулна уу");
      return;
    }
    const success = login(email, password);
    if (success) {
      setOpen(false);
      resetState();
    } else {
      setError("Имэйл эсвэл нууц үг буруу байна");
    }
  };

  const [profileOpen, setProfileOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [profileData, setProfileData] = React.useState({
    firstName: "Батбаяр",
    lastName: "Дорж",
    phone: "+976 9911 2233",
    birthDate: "1995-05-15",
  });

  interface Education {
    id: number;
    school: string;
    degree: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
  }

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
  const [editingEducationId, setEditingEducationId] = React.useState<number | null>(null);
  const [newEducation, setNewEducation] = React.useState<Omit<Education, "id">>({
    school: "",
    degree: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
  });

  const handleAddEducation = () => {
    if (educations.length >= 5) return;
    if (!newEducation.school || !newEducation.degree || !newEducation.startDate) return;

    setEducations([
      ...educations,
      { ...newEducation, id: Date.now() },
    ]);
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
    if (!newEducation.school || !newEducation.degree || !newEducation.startDate) return;

    setEducations(educations.map((edu) =>
      edu.id === editingEducationId
        ? { ...newEducation, id: edu.id }
        : edu
    ));
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

  interface WorkExperience {
    id: number;
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
  }

  const [workExperiences, setWorkExperiences] = React.useState<WorkExperience[]>([
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

  const handleAddWork = () => {
    if (workExperiences.length >= 5) return;
    if (!newWork.company || !newWork.position || !newWork.startDate) return;

    setWorkExperiences([
      ...workExperiences,
      { ...newWork, id: Date.now() },
    ]);
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

    setWorkExperiences(workExperiences.map((work) =>
      work.id === editingWorkId
        ? { ...newWork, id: work.id }
        : work
    ));
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

  const formatWorkDate = (dateStr: string) => {
    if (!dateStr) return "Одоог хүртэл";
    const [year, month] = dateStr.split("-");
    const months = ["1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар", "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар"];
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
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        updateAvatar(result);
      };
      reader.readAsDataURL(file);
    }
  };

  // If user is authenticated, show user menu
  if (isAuthenticated && user) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="relative">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 md:w-9 md:h-9 rounded-full object-cover border-2 border-blue-500"
                />
                {/* Online indicator */}
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 md:w-3 md:h-3 bg-green-500 rounded-full border-[2px] border-background" />
              </div>
              <span className="hidden md:block text-sm font-medium max-w-24 truncate">
                {user.name}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center gap-3 p-3 border-b">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setProfileOpen(true)}>
              <UserCircle className="h-4 w-4" />
              Миний профайл
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 cursor-pointer text-red-600 focus:text-red-600"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              Гарах
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile Modal */}
        <Dialog open={profileOpen} onOpenChange={(open) => {
          setProfileOpen(open);
          if (!open) setIsEditing(false);
        }}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-xl p-0 max-h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader className="p-4 sm:p-6 pb-0 shrink-0">
              <DialogTitle className="text-center text-lg">Миний профайл</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-4 space-y-6">
              {/* Avatar and Name */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-24 h-24 rounded-full object-cover border-[3px] border-blue-500"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors border-2 border-background"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold">{user.name}</h3>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-yellow-500 mb-1">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="font-bold">4.9</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Үнэлгээ</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
                    <ThumbsUp className="h-4 w-4" />
                    <span className="font-bold">127</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Амжилттай</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-red-500 mb-1">
                    <ThumbsDown className="h-4 w-4" />
                    <span className="font-bold">2</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Амжилтгүй</p>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <User className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Нэр</p>
                    {isEditing ? (
                      <Input
                        value={profileData.firstName}
                        onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                        className="h-8 text-sm mt-1"
                      />
                    ) : (
                      <p className="text-sm font-medium">{profileData.firstName}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <User className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Овог</p>
                    {isEditing ? (
                      <Input
                        value={profileData.lastName}
                        onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                        className="h-8 text-sm mt-1"
                      />
                    ) : (
                      <p className="text-sm font-medium">{profileData.lastName}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Имэйл</p>
                    <p className="text-sm font-medium">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Phone className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Утас</p>
                    {isEditing ? (
                      <Input
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        className="h-8 text-sm mt-1"
                      />
                    ) : (
                      <p className="text-sm font-medium">{profileData.phone}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Cake className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Төрсөн огноо</p>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={profileData.birthDate}
                        onChange={(e) => setProfileData({ ...profileData, birthDate: e.target.value })}
                        className="h-8 text-sm mt-1"
                      />
                    ) : (
                      <p className="text-sm font-medium">{formatBirthDate(profileData.birthDate)}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Бүртгүүлсэн</p>
                    <p className="text-sm font-medium">2023 оны 5-р сар</p>
                  </div>
                </div>
              </div>

              {/* Education */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-muted-foreground" />
                    <h4 className="font-semibold text-sm">Боловсрол</h4>
                  </div>
                  {educations.length < 5 && !showAddEducation && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs gap-1"
                      onClick={() => setShowAddEducation(true)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Нэмэх
                    </Button>
                  )}
                </div>

                {/* Add Education Form */}
                {showAddEducation && (
                  <div className="p-3 border rounded-lg space-y-3 bg-muted/20">
                    <AutocompleteInput
                      placeholder="Сургуулийн нэр"
                      value={newEducation.school}
                      onChange={(value) => setNewEducation({ ...newEducation, school: value })}
                      suggestions={SCHOOLS_DB}
                      className="h-9 text-sm"
                    />
                    <AutocompleteInput
                      placeholder="Мэргэжил, зэрэг"
                      value={newEducation.degree}
                      onChange={(value) => setNewEducation({ ...newEducation, degree: value })}
                      suggestions={DEGREES_DB}
                      className="h-9 text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Эхэлсэн</label>
                        <Input
                          type="month"
                          value={newEducation.startDate}
                          onChange={(e) => setNewEducation({ ...newEducation, startDate: e.target.value })}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Төгссөн</label>
                        <Input
                          type="month"
                          value={newEducation.endDate}
                          onChange={(e) => setNewEducation({ ...newEducation, endDate: e.target.value })}
                          disabled={newEducation.isCurrent}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newEducation.isCurrent}
                        onChange={(e) => setNewEducation({ ...newEducation, isCurrent: e.target.checked, endDate: "" })}
                        className="rounded"
                      />
                      Одоо суралцаж байгаа
                    </label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={handleAddEducation}
                        disabled={!newEducation.school || !newEducation.degree || !newEducation.startDate}
                      >
                        Хадгалах
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                          setShowAddEducation(false);
                          setNewEducation({ school: "", degree: "", startDate: "", endDate: "", isCurrent: false });
                        }}
                      >
                        Болих
                      </Button>
                    </div>
                  </div>
                )}

                {/* Education List */}
                {educations.length === 0 && !showAddEducation ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Боловсролын мэдээлэл нэмээгүй байна
                  </p>
                ) : (
                  <div className="space-y-2">
                    {[...educations].sort((a, b) => {
                      // Sort by start date descending (newest first)
                      return b.startDate.localeCompare(a.startDate);
                    }).map((edu) => (
                      editingEducationId === edu.id ? (
                        <div key={edu.id} className="p-3 border rounded-lg space-y-3 bg-muted/20">
                          <AutocompleteInput
                            placeholder="Сургуулийн нэр"
                            value={newEducation.school}
                            onChange={(value) => setNewEducation({ ...newEducation, school: value })}
                            suggestions={SCHOOLS_DB}
                            className="h-9 text-sm"
                          />
                          <AutocompleteInput
                            placeholder="Мэргэжил, зэрэг"
                            value={newEducation.degree}
                            onChange={(value) => setNewEducation({ ...newEducation, degree: value })}
                            suggestions={DEGREES_DB}
                            className="h-9 text-sm"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Эхэлсэн</label>
                              <Input
                                type="month"
                                value={newEducation.startDate}
                                onChange={(e) => setNewEducation({ ...newEducation, startDate: e.target.value })}
                                className="h-9 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Төгссөн</label>
                              <Input
                                type="month"
                                value={newEducation.endDate}
                                onChange={(e) => setNewEducation({ ...newEducation, endDate: e.target.value })}
                                disabled={newEducation.isCurrent}
                                className="h-9 text-sm"
                              />
                            </div>
                          </div>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newEducation.isCurrent}
                              onChange={(e) => setNewEducation({ ...newEducation, isCurrent: e.target.checked, endDate: "" })}
                              className="rounded"
                            />
                            Одоо суралцаж байгаа
                          </label>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 h-8 text-xs"
                              onClick={handleSaveEducation}
                              disabled={!newEducation.school || !newEducation.degree || !newEducation.startDate}
                            >
                              Хадгалах
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={handleCancelEditEducation}
                            >
                              Болих
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          key={edu.id}
                          className="p-3 bg-muted/30 rounded-lg group relative cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleEditEducation(edu)}
                        >
                          <div className="pr-16">
                            <p className="font-medium text-sm">{edu.degree}</p>
                            <p className="text-xs text-muted-foreground">{edu.school}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatWorkDate(edu.startDate)} - {edu.isCurrent ? "Одоог хүртэл" : formatWorkDate(edu.endDate)}
                            </p>
                          </div>
                          <div className="absolute top-3 right-3 flex gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditEducation(edu); }}
                              className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-blue-100 dark:hover:bg-blue-950/50 text-blue-500 transition-opacity"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteEducation(edu.id); }}
                              className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-950/50 text-red-500 transition-opacity"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}

                {educations.length > 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    {educations.length}/5 боловсрол
                  </p>
                )}
              </div>

              {/* Work Experience */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                    <h4 className="font-semibold text-sm">Ажлын туршлага</h4>
                  </div>
                  {workExperiences.length < 5 && !showAddWork && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs gap-1"
                      onClick={() => setShowAddWork(true)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Нэмэх
                    </Button>
                  )}
                </div>

                {/* Add Work Form */}
                {showAddWork && (
                  <div className="p-3 border rounded-lg space-y-3 bg-muted/20">
                    <AutocompleteInput
                      placeholder="Байгууллагын нэр"
                      value={newWork.company}
                      onChange={(value) => setNewWork({ ...newWork, company: value })}
                      suggestions={COMPANIES_DB}
                      className="h-9 text-sm"
                    />
                    <AutocompleteInput
                      placeholder="Албан тушаал"
                      value={newWork.position}
                      onChange={(value) => setNewWork({ ...newWork, position: value })}
                      suggestions={POSITIONS_DB}
                      className="h-9 text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Эхэлсэн</label>
                        <Input
                          type="month"
                          value={newWork.startDate}
                          onChange={(e) => setNewWork({ ...newWork, startDate: e.target.value })}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Дууссан</label>
                        <Input
                          type="month"
                          value={newWork.endDate}
                          onChange={(e) => setNewWork({ ...newWork, endDate: e.target.value })}
                          disabled={newWork.isCurrent}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newWork.isCurrent}
                        onChange={(e) => setNewWork({ ...newWork, isCurrent: e.target.checked, endDate: "" })}
                        className="rounded"
                      />
                      Одоо ажиллаж байгаа
                    </label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={handleAddWork}
                        disabled={!newWork.company || !newWork.position || !newWork.startDate}
                      >
                        Хадгалах
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                          setShowAddWork(false);
                          setNewWork({ company: "", position: "", startDate: "", endDate: "", isCurrent: false });
                        }}
                      >
                        Болих
                      </Button>
                    </div>
                  </div>
                )}

                {/* Work List */}
                {workExperiences.length === 0 && !showAddWork ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Ажлын туршлага нэмээгүй байна
                  </p>
                ) : (
                  <div className="space-y-2">
                    {[...workExperiences].sort((a, b) => {
                      // Sort by start date descending (newest first)
                      return b.startDate.localeCompare(a.startDate);
                    }).map((work) => (
                      editingWorkId === work.id ? (
                        <div key={work.id} className="p-3 border rounded-lg space-y-3 bg-muted/20">
                          <AutocompleteInput
                            placeholder="Байгууллагын нэр"
                            value={newWork.company}
                            onChange={(value) => setNewWork({ ...newWork, company: value })}
                            suggestions={COMPANIES_DB}
                            className="h-9 text-sm"
                          />
                          <AutocompleteInput
                            placeholder="Албан тушаал"
                            value={newWork.position}
                            onChange={(value) => setNewWork({ ...newWork, position: value })}
                            suggestions={POSITIONS_DB}
                            className="h-9 text-sm"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Эхэлсэн</label>
                              <Input
                                type="month"
                                value={newWork.startDate}
                                onChange={(e) => setNewWork({ ...newWork, startDate: e.target.value })}
                                className="h-9 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Дууссан</label>
                              <Input
                                type="month"
                                value={newWork.endDate}
                                onChange={(e) => setNewWork({ ...newWork, endDate: e.target.value })}
                                disabled={newWork.isCurrent}
                                className="h-9 text-sm"
                              />
                            </div>
                          </div>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newWork.isCurrent}
                              onChange={(e) => setNewWork({ ...newWork, isCurrent: e.target.checked, endDate: "" })}
                              className="rounded"
                            />
                            Одоо ажиллаж байгаа
                          </label>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 h-8 text-xs"
                              onClick={handleSaveWork}
                              disabled={!newWork.company || !newWork.position || !newWork.startDate}
                            >
                              Хадгалах
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={handleCancelEditWork}
                            >
                              Болих
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          key={work.id}
                          className="p-3 bg-muted/30 rounded-lg group relative cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleEditWork(work)}
                        >
                          <div className="pr-16">
                            <p className="font-medium text-sm">{work.position}</p>
                            <p className="text-xs text-muted-foreground">{work.company}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatWorkDate(work.startDate)} - {work.isCurrent ? "Одоог хүртэл" : formatWorkDate(work.endDate)}
                            </p>
                          </div>
                          <div className="absolute top-3 right-3 flex gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditWork(work); }}
                              className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-blue-100 dark:hover:bg-blue-950/50 text-blue-500 transition-opacity"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteWork(work.id); }}
                              className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-950/50 text-red-500 transition-opacity"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}

                {workExperiences.length > 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    {workExperiences.length}/5 ажлын туршлага
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {!isEditing && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Засварлах
                  </Button>
                )}

                {isEditing ? (
                  <Button
                    className="w-full"
                    onClick={() => setIsEditing(false)}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Хадгалах
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    onClick={() => {
                      logout();
                      setProfileOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Гарах
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetState();
    }}>
      <DialogTrigger asChild>
        <Button className="text-sm md:text-base">Нэвтрэх</Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-center text-lg sm:text-2xl">
            <span className="text-[#c4272f]">Uilc</span>
            <span className="text-[#015197]">hilge</span>
            <span className="text-[#c4272f]">e.mn</span>
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-9 sm:h-10">
            <TabsTrigger value="login" className="text-xs sm:text-sm">Нэвтрэх</TabsTrigger>
            <TabsTrigger value="register" className="text-xs sm:text-sm">Бүртгүүлэх</TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
            {/* Google Login */}
            <Button variant="outline" className="w-full gap-2 h-9 sm:h-10 text-xs sm:text-sm">
              <GoogleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              Google-ээр нэвтрэх
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-[10px] sm:text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  эсвэл
                </span>
              </div>
            </div>

            {/* Phone Login */}
            <div className="space-y-2 sm:space-y-3">
              {phoneStep === "phone" ? (
                <>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="Утасны дугаар"
                      className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
                    />
                  </div>
                  <Button
                    className="w-full h-9 sm:h-10 text-sm"
                    onClick={() => setPhoneStep("code")}
                  >
                    Код авах
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-xs sm:text-sm text-muted-foreground text-center">
                    Таны утсанд илгээсэн кодыг оруулна уу
                  </p>
                  <div className="flex gap-2 justify-center">
                    {[1, 2, 3, 4].map((i) => (
                      <Input
                        key={i}
                        type="text"
                        maxLength={1}
                        className="w-10 h-10 sm:w-12 sm:h-12 text-center text-lg sm:text-xl"
                      />
                    ))}
                  </div>
                  <Button className="w-full h-9 sm:h-10 text-sm">Нэвтрэх</Button>
                  <Button
                    variant="ghost"
                    className="w-full text-xs sm:text-sm h-8 sm:h-9"
                    onClick={() => setPhoneStep("phone")}
                  >
                    Буцах
                  </Button>
                </>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-[10px] sm:text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  эсвэл имэйлээр
                </span>
              </div>
            </div>

            {/* Email Login */}
            <div className="space-y-2 sm:space-y-3">
              {error && (
                <p className="text-xs sm:text-sm text-red-500 text-center bg-red-50 dark:bg-red-950/30 p-2 rounded">
                  {error}
                </p>
              )}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Имэйл"
                  className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Нууц үг"
                  className="pl-9 sm:pl-10 pr-9 sm:pr-10 h-9 sm:h-10 text-sm"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleLogin();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  ) : (
                    <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                </button>
              </div>
              <Button className="w-full h-9 sm:h-10 text-sm" onClick={handleLogin}>
                Нэвтрэх
              </Button>
              <Button variant="link" className="w-full text-xs sm:text-sm h-8">
                Нууц үгээ мартсан?
              </Button>

              {/* Test credentials hint */}
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                <p className="font-medium mb-1">Тест хэрэглэгч:</p>
                <p>Имэйл: <span className="font-mono text-foreground">test@test.com</span></p>
                <p>Нууц үг: <span className="font-mono text-foreground">123456</span></p>
              </div>
            </div>
          </TabsContent>

          {/* Register Tab */}
          <TabsContent value="register" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
            {/* Google Register */}
            <Button variant="outline" className="w-full gap-2 h-9 sm:h-10 text-xs sm:text-sm">
              <GoogleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              Google-ээр бүртгүүлэх
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-[10px] sm:text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  эсвэл
                </span>
              </div>
            </div>

            {/* Registration Form */}
            <div className="space-y-2 sm:space-y-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input placeholder="Нэр" className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm" />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input type="tel" placeholder="Утасны дугаар" className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm" />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input type="email" placeholder="Имэйл" className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm" />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Нууц үг"
                  className="pl-9 sm:pl-10 pr-9 sm:pr-10 h-9 sm:h-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  ) : (
                    <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Нууц үг давтах"
                  className="pl-9 sm:pl-10 pr-9 sm:pr-10 h-9 sm:h-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  ) : (
                    <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                </button>
              </div>
              <Button className="w-full h-9 sm:h-10 text-sm">Бүртгүүлэх</Button>
            </div>

            <p className="text-[10px] sm:text-xs text-center text-muted-foreground">
              Бүртгүүлснээр та манай{" "}
              <a href="#" className="text-primary hover:underline">
                үйлчилгээний нөхцөл
              </a>{" "}
              болон{" "}
              <a href="#" className="text-primary hover:underline">
                нууцлалын бодлого
              </a>
              -г зөвшөөрч байна.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
