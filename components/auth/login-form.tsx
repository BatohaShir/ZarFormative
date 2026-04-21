"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

interface LoginFormProps {
  onSuccess: () => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
}

type Mode = "login" | "reset";

export function LoginForm({ onSuccess, signIn }: LoginFormProps) {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const { requestPasswordReset } = useAuth();
  const [mode, setMode] = React.useState<Mode>("login");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [resetSent, setResetSent] = React.useState(false);

  const handleLogin = React.useCallback(async () => {
    if (!email || !password) {
      setError(t("enterEmailAndPassword"));
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
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password, signIn, onSuccess, t]);

  const handleReset = React.useCallback(async () => {
    if (!email) {
      setError(t("enterEmail"));
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const { error } = await requestPasswordReset(email);
      if (error) {
        setError(error);
        return;
      }
      setResetSent(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, requestPasswordReset, t]);

  if (mode === "reset") {
    return (
      <div className="space-y-3 sm:space-y-4">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError("");
            setResetSent(false);
          }}
          className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("resetPasswordBack")}
        </button>

        <div>
          <h3 className="text-base sm:text-lg font-semibold">{t("resetPasswordTitle")}</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {t("resetPasswordDescription")}
          </p>
        </div>

        {resetSent ? (
          <p className="text-xs sm:text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 p-3 rounded text-center">
            {t("resetPasswordEmailSent")}
          </p>
        ) : (
          <>
            {error && (
              <p className="text-xs sm:text-sm text-red-500 text-center bg-red-50 dark:bg-red-950/30 p-2 rounded">
                {error}
              </p>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                type="email"
                autoComplete="email"
                placeholder={t("email")}
                className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleReset();
                }}
              />
            </div>
            <Button
              className="w-full h-9 sm:h-10 text-sm"
              onClick={handleReset}
              disabled={isSubmitting}
            >
              {isSubmitting ? tCommon("loading") : t("resetPasswordSend")}
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
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
          autoComplete="email"
          placeholder={t("email")}
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
          autoComplete="current-password"
          placeholder={t("password")}
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
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          ) : (
            <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          )}
        </button>
      </div>
      <Button className="w-full h-9 sm:h-10 text-sm" onClick={handleLogin} disabled={isSubmitting}>
        {isSubmitting ? tCommon("loading") : t("login")}
      </Button>
      <Button
        variant="link"
        type="button"
        className="w-full text-xs sm:text-sm h-8"
        onClick={() => {
          setMode("reset");
          setError("");
        }}
      >
        {t("forgotPassword")}
      </Button>
    </div>
  );
}
