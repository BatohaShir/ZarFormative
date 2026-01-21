"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Mail, Lock, Eye, EyeOff, LogIn, type LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

interface LoginPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  title?: string;
  description?: string;
  icon?: LucideIcon;
}

export function LoginPromptModal({
  open,
  onOpenChange,
  onSuccess,
  title = "Нэвтэрнэ үү",
  description = "Үргэлжлүүлэхийн тулд нэвтрэх шаардлагатай.",
  icon: Icon = LogIn,
}: LoginPromptModalProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Имэйл болон нууц үгээ оруулна уу");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error);
        return;
      }
      setEmail("");
      setPassword("");
      setError("");
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-xl p-4 sm:p-6">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-lg">{title}</DialogTitle>
          <DialogDescription className="text-sm">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Email Login */}
          <div className="space-y-3">
            {error && (
              <p className="text-xs text-red-500 text-center bg-red-50 dark:bg-red-950/30 p-2 rounded">
                {error}
              </p>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Имэйл"
                className="pl-10 h-10"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Нууц үг"
                className="pl-10 pr-10 h-10"
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
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <Button
              className="w-full h-10"
              onClick={handleLogin}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Уншиж байна..." : "Нэвтрэх"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
