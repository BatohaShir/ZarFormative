"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";

interface AuthModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AuthModal({ isOpen: controlledOpen, onClose }: AuthModalProps = {}) {
  const {
    user,
    signIn,
    signUp,
    isAuthenticated,
    displayName,
    avatarUrl,
  } = useAuth();

  const [internalOpen, setInternalOpen] = React.useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled
    ? (value: boolean) => {
        if (!value && onClose) onClose();
      }
    : setInternalOpen;

  const handleSuccess = React.useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  // If user is authenticated, show direct link to profile
  if (isAuthenticated && user) {
    return (
      <Link
        href="/account/me"
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <div className="relative">
          <Image
            src={avatarUrl}
            alt={displayName}
            width={36}
            height={36}
            unoptimized={avatarUrl.includes("dicebear")}
            className="w-8 h-8 md:w-9 md:h-9 rounded-full object-cover border-2 border-primary"
          />
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 md:w-3 md:h-3 bg-green-500 rounded-full border-2 border-background" />
        </div>
        <span className="hidden md:block text-sm font-medium max-w-24 truncate">
          {displayName}
        </span>
      </Link>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
      }}
    >
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
            <TabsTrigger value="login" className="text-xs sm:text-sm">
              Нэвтрэх
            </TabsTrigger>
            <TabsTrigger value="register" className="text-xs sm:text-sm">
              Бүртгүүлэх
            </TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login" className="mt-3 sm:mt-4">
            <LoginForm onSuccess={handleSuccess} signIn={signIn} />
          </TabsContent>

          {/* Register Tab */}
          <TabsContent value="register" className="mt-3 sm:mt-4">
            <RegisterForm onSuccess={handleSuccess} signUp={signUp} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
