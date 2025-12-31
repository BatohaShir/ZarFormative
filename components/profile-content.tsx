"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  Pencil,
  Save,
  Briefcase,
  Plus,
  Trash2,
  GraduationCap,
  Cake,
  Mail,
  Phone,
  User,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

// Копируем данные из auth-modal
const SCHOOLS_DB = [
  "МУИС", "ШУТИС", "ХААИС", "МУБИС", "СУИС",
  "Отгонтэнгэр их сургууль", "Монгол Улсын Их Сургууль",
  "Шинжлэх Ухаан Технологийн Их Сургууль",
];

const COMPANIES_DB = [
  "Голомт банк", "Хаан банк", "Худалдаа хөгжлийн банк",
  "Төрийн банк", "Монгол Пост", "МЦС", "Юнител",
  "Оюу Толгой", "Эрдэнэт үйлдвэр",
];

const POSITIONS_DB = [
  "Програм хангамжийн инженер", "IT мэргэжилтэн",
  "Веб хөгжүүлэгч", "Мобайл хөгжүүлэгч",
  "Төслийн менежер", "Бизнес шинжээч",
];

const DEGREES_DB = [
  "Бакалавр", "Магистр", "Доктор",
  "Компьютерийн ухаан", "Мэдээллийн технологи",
  "Программ хангамж", "Бизнесийн удирдлага",
];

// Autocomplete Input
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
  const [filteredSuggestions, setFilteredSuggestions] = React.useState<string[]>([]);
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
          if (
            filteredSuggestions.length > 0 &&
            !suggestions.includes(value)
          ) {
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

interface ProfileContentProps {
  onClose?: () => void;
}

export function ProfileContent({ onClose }: ProfileContentProps) {
  const { user, logout, updateAvatar } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = React.useState(false);

  const [profileData, setProfileData] = React.useState({
    firstName: "Батбаяр",
    lastName: "Дорж",
    phone: "+976 9911 2233",
    birthDate: "1995-05-15",
  });

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

  const [showAddEducation, setShowAddEducation] = React.useState(false);
  const [editingEducationId, setEditingEducationId] = React.useState<number | null>(null);
  const [newEducation, setNewEducation] = React.useState<Omit<Education, "id">>({
    school: "",
    degree: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
  });

  const [showAddWork, setShowAddWork] = React.useState(false);
  const [editingWorkId, setEditingWorkId] = React.useState<number | null>(null);
  const [newWork, setNewWork] = React.useState<Omit<WorkExperience, "id">>({
    company: "",
    position: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
  });

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
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        updateAvatar(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = () => {
    logout();
    if (onClose) onClose();
  };

  // Education handlers
  const handleAddEducation = () => {
    if (educations.length >= 5) return;
    if (!newEducation.school || !newEducation.degree || !newEducation.startDate) return;

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
    if (!newEducation.school || !newEducation.degree || !newEducation.startDate) return;

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

  // Work handlers
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

  if (!user) return null;

  return (
    <div className="space-y-6">
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
                onChange={(e) =>
                  setProfileData({ ...profileData, firstName: e.target.value })
                }
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
                onChange={(e) =>
                  setProfileData({ ...profileData, lastName: e.target.value })
                }
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
                onChange={(e) =>
                  setProfileData({ ...profileData, phone: e.target.value })
                }
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
                onChange={(e) =>
                  setProfileData({ ...profileData, birthDate: e.target.value })
                }
                className="h-8 text-sm mt-1"
              />
            ) : (
              <p className="text-sm font-medium">
                {formatBirthDate(profileData.birthDate)}
              </p>
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
          <Button className="w-full" onClick={() => setIsEditing(false)}>
            <Save className="h-4 w-4 mr-2" />
            Хадгалах
          </Button>
        ) : (
          <Button
            variant="outline"
            className="w-full text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Гарах
          </Button>
        )}
      </div>
    </div>
  );
}
