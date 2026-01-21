"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Mail,
  MessageSquare,
  FileText,
  Moon,
  Sun,
  Monitor,
  Palette,
  Check,
  Loader2,
  Sparkles,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { LoginPromptModal } from "@/components/login-prompt-modal";
import { useTheme } from "next-themes";
import { usePushSubscription } from "@/hooks/use-push-subscription";
import {
  useNotificationSettings,
  type NotificationSettings,
} from "@/hooks/use-notification-settings";
import { cn } from "@/lib/utils";

// Setting Item Component
function SettingItem({
  icon: Icon,
  iconColor,
  title,
  description,
  children,
  className,
}: {
  icon: React.ElementType;
  iconColor?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 bg-card rounded-xl border transition-all hover:shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
            iconColor || "bg-primary/10"
          )}
        >
          <Icon className={cn("h-5 w-5", iconColor ? "text-white" : "text-primary")} />
        </div>
        <div className="flex-1 min-w-0">
          <Label className="text-sm font-medium block">{title}</Label>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
          )}
        </div>
      </div>
      <div className="shrink-0 ml-3">{children}</div>
    </div>
  );
}

// Sub-setting Item
function SubSettingItem({
  icon: Icon,
  title,
  checked,
  onCheckedChange,
}: {
  icon: React.ElementType;
  title: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{title}</span>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

// Theme Selector Component
function ThemeSelector({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  const themes = [
    { value: "light", label: "Цайвар", icon: Sun, color: "bg-amber-500" },
    { value: "dark", label: "Бараан", icon: Moon, color: "bg-slate-700" },
    { value: "system", label: "Систем", icon: Monitor, color: "bg-blue-500" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {themes.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
            value === t.value
              ? "border-primary bg-primary/5"
              : "border-transparent bg-muted/50 hover:bg-muted"
          )}
        >
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", t.color)}>
            <t.icon className="h-5 w-5 text-white" />
          </div>
          <span className="text-xs font-medium">{t.label}</span>
          {value === t.value && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
              <Check className="h-3 w-3 text-white" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

export default function AppSettingsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  // Use ZenStack hooks for notification settings
  const { settings, updateSetting, saveSettings, isLoading, isSaving } = useNotificationSettings();

  // Use ZenStack hook for push subscription
  const {
    isSupported: pushSupported,
    permission: pushPermission,
    isLoading: pushLoading,
    subscribe,
    unsubscribe,
  } = usePushSubscription();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Handle auth state
  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setShowLoginModal(true);
    }
  }, [authLoading, isAuthenticated]);

  const handleLoginModalClose = (open: boolean) => {
    if (!open && !isAuthenticated) {
      router.push("/");
    } else {
      setShowLoginModal(open);
    }
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      const success = await subscribe();
      if (success) {
        updateSetting("pushEnabled", true);
      }
    } else {
      await unsubscribe();
      updateSetting("pushEnabled", false);
    }
  };

  const handleSettingChange = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    updateSetting(key, value);
  };

  const handleSave = async () => {
    setSaveSuccess(false);
    try {
      await saveSettings();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      router.push("/");
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background pb-24 md:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 h-14 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold">Апп тохиргоо</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        {/* Appearance Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Palette className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Харагдац
            </h2>
          </div>

          <div className="bg-card rounded-2xl border p-4 space-y-4">
            <div>
              <Label className="text-sm font-medium mb-3 block">Өнгөний загвар</Label>
              {mounted && <ThemeSelector value={theme} onChange={setTheme} />}
            </div>
          </div>
        </section>

        {/* Push Notifications Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Bell className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Push мэдэгдэл
            </h2>
          </div>

          <div className="bg-card rounded-2xl border overflow-hidden">
            <SettingItem
              icon={settings.pushEnabled && pushPermission === "granted" ? Bell : BellOff}
              iconColor={
                settings.pushEnabled && pushPermission === "granted" ? "bg-green-500" : "bg-gray-400"
              }
              title="Push мэдэгдэл"
              description={
                !pushSupported
                  ? "Таны браузер дэмжихгүй"
                  : pushPermission === "denied"
                  ? "Браузерын тохиргооноос зөвшөөрнө үү"
                  : settings.pushEnabled
                  ? "Идэвхтэй"
                  : "Идэвхгүй"
              }
              className="border-0 rounded-none"
            >
              <Switch
                checked={settings.pushEnabled && pushPermission === "granted"}
                onCheckedChange={handlePushToggle}
                disabled={!pushSupported || pushPermission === "denied" || pushLoading}
              />
            </SettingItem>

            {settings.pushEnabled && pushPermission === "granted" && (
              <div className="border-t bg-muted/30">
                <SubSettingItem
                  icon={FileText}
                  title="Шинэ захиалга"
                  checked={settings.pushNewRequests}
                  onCheckedChange={(v) => handleSettingChange("pushNewRequests", v)}
                />
                <SubSettingItem
                  icon={MessageSquare}
                  title="Шинэ мессеж"
                  checked={settings.pushNewMessages}
                  onCheckedChange={(v) => handleSettingChange("pushNewMessages", v)}
                />
                <SubSettingItem
                  icon={Sparkles}
                  title="Статус өөрчлөлт"
                  checked={settings.pushStatusChanges}
                  onCheckedChange={(v) => handleSettingChange("pushStatusChanges", v)}
                />
              </div>
            )}
          </div>
        </section>

        {/* Email Notifications Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Mail className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Имэйл мэдэгдэл
            </h2>
          </div>

          <div className="bg-card rounded-2xl border overflow-hidden">
            <SettingItem
              icon={Mail}
              iconColor={settings.emailEnabled ? "bg-blue-500" : "bg-gray-400"}
              title="Имэйл мэдэгдэл"
              description={settings.emailEnabled ? "Идэвхтэй" : "Идэвхгүй"}
              className="border-0 rounded-none"
            >
              <Switch
                checked={settings.emailEnabled}
                onCheckedChange={(v) => handleSettingChange("emailEnabled", v)}
              />
            </SettingItem>

            {settings.emailEnabled && (
              <div className="border-t bg-muted/30">
                <SubSettingItem
                  icon={FileText}
                  title="Шинэ захиалга"
                  checked={settings.emailNewRequests}
                  onCheckedChange={(v) => handleSettingChange("emailNewRequests", v)}
                />
                <SubSettingItem
                  icon={MessageSquare}
                  title="Шинэ мессеж (оффлайн)"
                  checked={settings.emailNewMessages}
                  onCheckedChange={(v) => handleSettingChange("emailNewMessages", v)}
                />
                <SubSettingItem
                  icon={Mail}
                  title="Өдрийн тойм"
                  checked={settings.emailDigest}
                  onCheckedChange={(v) => handleSettingChange("emailDigest", v)}
                />

                {settings.emailDigest && (
                  <div className="flex items-center justify-between py-3 px-4 border-t">
                    <span className="text-sm text-muted-foreground">Тоймын давтамж</span>
                    <Select
                      value={settings.emailDigestFrequency}
                      onValueChange={(v) =>
                        handleSettingChange("emailDigestFrequency", v as "daily" | "weekly" | "never")
                      }
                    >
                      <SelectTrigger className="w-32 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Өдөр бүр</SelectItem>
                        <SelectItem value="weekly">7 хоног</SelectItem>
                        <SelectItem value="never">Хэзээ ч үгүй</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Quiet Hours Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Moon className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Тайван цаг
            </h2>
          </div>

          <div className="bg-card rounded-2xl border overflow-hidden">
            <SettingItem
              icon={Moon}
              iconColor={settings.quietHoursEnabled ? "bg-indigo-500" : "bg-gray-400"}
              title="Тайван цаг"
              description={
                settings.quietHoursEnabled
                  ? `${settings.quietHoursStart} - ${settings.quietHoursEnd}`
                  : "Идэвхгүй"
              }
              className="border-0 rounded-none"
            >
              <Switch
                checked={settings.quietHoursEnabled}
                onCheckedChange={(v) => handleSettingChange("quietHoursEnabled", v)}
              />
            </SettingItem>

            {settings.quietHoursEnabled && (
              <div className="border-t bg-muted/30 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Эхлэх</Label>
                    <input
                      type="time"
                      value={settings.quietHoursStart}
                      onChange={(e) => handleSettingChange("quietHoursStart", e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Дуусах</Label>
                    <input
                      type="time"
                      value={settings.quietHoursEnd}
                      onChange={(e) => handleSettingChange("quietHoursEnd", e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Logout Section */}
        <section className="space-y-3 pt-4">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center gap-2 p-4 bg-card rounded-2xl border text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-50"
          >
            {isLoggingOut ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <LogOut className="h-5 w-5" />
            )}
            <span className="font-medium">Гарах</span>
          </button>
        </section>
      </div>

      {/* Fixed Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent md:relative md:bg-none md:p-0">
        <div className="container mx-auto max-w-2xl md:px-4 md:pb-6">
          <Button
            className={cn(
              "w-full h-12 rounded-xl text-base font-medium transition-all",
              saveSuccess && "bg-green-500 hover:bg-green-600"
            )}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Хадгалж байна...
              </>
            ) : saveSuccess ? (
              <>
                <Check className="h-5 w-5 mr-2" />
                Хадгалагдлаа!
              </>
            ) : (
              "Хадгалах"
            )}
          </Button>
        </div>
      </div>

      {/* Login Modal */}
      <LoginPromptModal open={showLoginModal} onOpenChange={handleLoginModalClose} />
    </div>
  );
}
