"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Phone,
  Mail,
  User,
  LogOut,
  UserCircle,
  Building2,
  Star,
  ThumbsUp,
  ThumbsDown,
  Pencil,
  Settings,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { EducationSection } from "@/components/auth/education-section";
import { WorkExperienceSection } from "@/components/auth/work-experience-section";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface Profile {
  first_name?: string | null;
  last_name?: string | null;
  phone_number?: string | null;
  is_company?: boolean;
  company_name?: string | null;
  registration_number?: string | null;
}

interface UserMenuProps {
  user: SupabaseUser;
  profile: Profile | null;
  signOut: () => Promise<void>;
  uploadAvatar: (file: File) => Promise<{ error: string | null }>;
  displayName: string;
  avatarUrl: string;
}

export function UserMenu({
  user,
  profile,
  signOut,
  uploadAvatar,
  displayName,
  avatarUrl,
}: UserMenuProps) {
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAvatarChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
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
    },
    [uploadAvatar]
  );

  const handleSignOut = React.useCallback(() => {
    signOut();
    setProfileOpen(false);
  }, [signOut]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="relative">
              <Image
                src={avatarUrl}
                alt={displayName}
                width={36}
                height={36}
                unoptimized={avatarUrl.includes("dicebear")}
                className="w-8 h-8 md:w-9 md:h-9 rounded-full object-cover border-2 border-blue-500"
              />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 md:w-3 md:h-3 bg-green-500 rounded-full border-2 border-background" />
            </div>
            <span className="hidden md:block text-sm font-medium max-w-24 truncate">
              {displayName}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="flex items-center gap-3 p-3 border-b">
            <Image
              src={avatarUrl}
              alt={displayName}
              width={40}
              height={40}
              unoptimized={avatarUrl.includes("dicebear")}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <DropdownMenuItem className="gap-2 cursor-pointer" asChild>
            <Link href="/account/me">
              <UserCircle className="h-4 w-4" />
              Миний профайл
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 cursor-pointer text-red-600 focus:text-red-600"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            Гарах
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Profile Modal */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-xl p-0 max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="p-4 sm:p-6 pb-0 shrink-0">
            <DialogTitle className="text-center text-lg">Миний профайл</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-4 space-y-6">
            {/* Avatar and Name */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  width={96}
                  height={96}
                  unoptimized={avatarUrl.includes("dicebear")}
                  className="w-24 h-24 rounded-full object-cover border-[3px] border-blue-500"
                />
                {isUploadingAvatar ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors border-2 border-background"
                  >
                    <Pencil className="h-3.5 w-3.5" />
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
              <div className="text-center">
                <h3 className="text-xl font-semibold">{displayName}</h3>
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
                  <p className="text-sm font-medium">{profile?.first_name || "-"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <User className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Овог</p>
                  <p className="text-sm font-medium">{profile?.last_name || "-"}</p>
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
                  <p className="text-sm font-medium">{profile?.phone_number || "-"}</p>
                </div>
              </div>
              {profile?.is_company && (
                <>
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Компанийн нэр</p>
                      <p className="text-sm font-medium">{profile.company_name || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Регистрийн дугаар</p>
                      <p className="text-sm font-medium">{profile.registration_number || "-"}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Education */}
            <EducationSection />

            {/* Work Experience */}
            <WorkExperienceSection />

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Гарах
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
