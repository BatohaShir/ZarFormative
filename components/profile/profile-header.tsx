"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Star, ThumbsUp, ThumbsDown, Camera, Pencil, Settings, Package } from "lucide-react";

interface ProfileHeaderProps {
  displayName: string;
  email: string;
  avatarUrl: string;
  averageRating: number;
  reviewCount: number;
  completedCount: number;
  failedCount: number;
  isUploadingAvatar: boolean;
  onAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onEditProfile: () => void;
}

export const ProfileHeader = React.memo(function ProfileHeader({
  displayName,
  email,
  avatarUrl,
  averageRating,
  reviewCount,
  completedCount,
  failedCount,
  isUploadingAvatar,
  onAvatarChange,
  onEditProfile,
}: ProfileHeaderProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
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
            onChange={onAvatarChange}
            className="hidden"
          />
        </div>

        {/* User Info */}
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2">
            {displayName}
          </h2>
          <p className="text-muted-foreground mb-4">{email}</p>

          {/* Stats - Horizontal on all screens */}
          <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 rounded-full">
              <Star className="h-5 w-5 text-yellow-500 fill-current" />
              <span className="font-bold text-lg">{averageRating > 0 ? averageRating : "-"}</span>
              <span className="text-sm text-muted-foreground">Үнэлгээ{reviewCount > 0 ? ` (${reviewCount})` : ""}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 rounded-full">
              <ThumbsUp className="h-5 w-5 text-green-500" />
              <span className="font-bold text-lg">{completedCount}</span>
              <span className="text-sm text-muted-foreground">Амжилттай</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 rounded-full">
              <ThumbsDown className="h-5 w-5 text-red-500" />
              <span className="font-bold text-lg">{failedCount}</span>
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
          <Button variant="outline" onClick={onEditProfile} className="gap-2">
            <Pencil className="h-4 w-4" />
            Засварлах
          </Button>
        </div>
      </div>
    </div>
  );
});
