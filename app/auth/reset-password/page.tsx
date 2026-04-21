"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Lock, Eye, EyeOff } from "lucide-react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";

// Password rules mirror registerSchema / SQL constraints.
function validateStrongPassword(password: string, t: (k: string) => string): string | null {
  if (password.length < 8) return t("passwordMinLength");
  if (!/[A-Z]/.test(password)) return t("passwordUppercase");
  if (!/[a-z]/.test(password)) return t("passwordLowercase");
  if (!/[0-9]/.test(password)) return t("passwordNumber");
  return null;
}

export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { updatePassword } = useAuth();

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  // null = still checking, true = valid recovery session, false = invalid link
  const [hasRecoverySession, setHasRecoverySession] = React.useState<boolean | null>(null);

  // When Supabase redirects back from the reset email, it fires a PASSWORD_RECOVERY
  // auth event and sets a short-lived recovery session. Only then should we allow
  // the password update; otherwise the page is just someone poking at the URL.
  React.useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (data.session) setHasRecoverySession(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setHasRecoverySession(true);
      }
    });

    // Give the SDK a moment to consume the URL hash; if no session by then, link is bad.
    const timeout = setTimeout(() => {
      setHasRecoverySession((prev) => prev ?? false);
    }, 2000);

    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validateStrongPassword(password, t);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (password !== confirmPassword) {
      setError(t("passwordsDoNotMatch"));
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: updateError } = await updatePassword(password);
      if (updateError) {
        setError(updateError);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/"), 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 bg-card p-6 rounded-xl border shadow-sm">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">{t("newPasswordTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("newPasswordDescription")}</p>
        </div>

        {hasRecoverySession === false ? (
          <div className="space-y-4">
            <p className="text-sm text-center text-red-600 bg-red-50 dark:bg-red-950/30 p-3 rounded">
              {t("newPasswordInvalidLink")}
            </p>
            <Button className="w-full" onClick={() => router.push("/")}>
              {t("resetPasswordBack")}
            </Button>
          </div>
        ) : hasRecoverySession === null ? (
          <p className="text-center text-sm text-muted-foreground">{tCommon("loading")}</p>
        ) : success ? (
          <p className="text-sm text-center text-green-600 bg-green-50 dark:bg-green-950/30 p-3 rounded">
            {t("newPasswordSuccess")}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={t("newPassword")}
                autoComplete="new-password"
                className="pl-10 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={t("confirmNewPassword")}
                autoComplete="new-password"
                className="pl-10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm text-center text-red-600 bg-red-50 dark:bg-red-950/30 p-2 rounded">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? tCommon("loading") : t("newPasswordSave")}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
