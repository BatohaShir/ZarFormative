"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, Mail, Lock, Eye, EyeOff } from "lucide-react";

interface LoginFormProps {
  onSuccess: () => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
}

export function LoginForm({ onSuccess, signIn }: LoginFormProps) {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [phoneStep, setPhoneStep] = React.useState<"phone" | "code">("phone");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");

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
  }, [email, password, signIn, onSuccess]);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Phone Login */}
      <div className="space-y-2 sm:space-y-3">
        {phoneStep === "phone" ? (
          <>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                type="tel"
                placeholder={t("phoneNumber")}
                className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
              />
            </div>
            <Button className="w-full h-9 sm:h-10 text-sm" onClick={() => setPhoneStep("code")}>
              {t("getCode")}
            </Button>
          </>
        ) : (
          <>
            <p className="text-xs sm:text-sm text-muted-foreground text-center">
              {t("enterCodeSent")}
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
            <Button className="w-full h-9 sm:h-10 text-sm">{t("login")}</Button>
            <Button
              variant="ghost"
              className="w-full text-xs sm:text-sm h-8 sm:h-9"
              onClick={() => setPhoneStep("phone")}
            >
              {tCommon("back")}
            </Button>
          </>
        )}
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-[10px] sm:text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">{t("orWithEmail")}</span>
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
          >
            {showPassword ? (
              <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            ) : (
              <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            )}
          </button>
        </div>
        <Button
          className="w-full h-9 sm:h-10 text-sm"
          onClick={handleLogin}
          disabled={isSubmitting}
        >
          {isSubmitting ? tCommon("loading") : t("login")}
        </Button>
        <Button variant="link" className="w-full text-xs sm:text-sm h-8">
          {t("forgotPassword")}
        </Button>
      </div>
    </div>
  );
}
