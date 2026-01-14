"use client";

import * as React from "react";
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
import { UserMenu } from "@/components/auth/user-menu";

interface AuthModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AuthModal({ isOpen: controlledOpen, onClose }: AuthModalProps = {}) {
  const {
    user,
    profile,
    signIn,
    signUp,
    signOut,
    isAuthenticated,
    uploadAvatar,
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

  // If user is authenticated, show user menu
  if (isAuthenticated && user) {
    return (
      <UserMenu
        user={user}
        profile={profile}
        signOut={signOut}
        uploadAvatar={uploadAvatar}
        displayName={displayName}
        avatarUrl={avatarUrl}
      />
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
