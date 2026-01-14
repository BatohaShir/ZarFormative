"use client";

import * as React from "react";
import Link from "next/link";
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
  ChevronRight,
  Check,
  Loader2,
  Sparkles,
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
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  registerServiceWorker,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";

interface NotificationSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  pushNewRequests: boolean;
  pushNewMessages: boolean;
  pushStatusChanges: boolean;
  emailNewRequests: boolean;
  emailNewMessages: boolean;
  emailDigest: boolean;
  emailDigestFrequency: "daily" | "weekly" | "never";
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

const defaultSettings: NotificationSettings = {
  pushEnabled: false,
  emailEnabled: true,
  pushNewRequests: true,
  pushNewMessages: true,
  pushStatusChanges: true,
  emailNewRequests: true,
  emailNewMessages: true,
  emailDigest: true,
  emailDigestFrequency: "daily",
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
};

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
    <div className={cn(
      "flex items-center justify-between p-4 bg-card rounded-xl border transition-all hover:shadow-sm",
      className
    )}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
          iconColor || "bg-primary/10"
        )}>
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
function ThemeSelector({ value, onChange }: { value: string | undefined; onChange: (v: string) => void }) {
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
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [settings, setSettings] = React.useState<NotificationSettings>(defaultSettings);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = React.useState(true);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [pushSupported, setPushSupported] = React.useState(false);
  const [pushPermission, setPushPermission] = React.useState<NotificationPermission | "unsupported">("default");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Load settings from server (for authenticated users) or localStorage
  React.useEffect(() => {
    async function loadSettings() {
      setIsLoadingSettings(true);

      try {
        // If authenticated, try to load from server first
        if (isAuthenticated && user) {
          const response = await fetch("/api/notifications/settings");
          if (response.ok) {
            const data = await response.json();
            if (data.settings) {
              // Map server response to local settings format
              const serverSettings: Partial<NotificationSettings> = {
                pushEnabled: data.settings.push_enabled ?? defaultSettings.pushEnabled,
                emailEnabled: data.settings.email_enabled ?? defaultSettings.emailEnabled,
                pushNewRequests: data.settings.push_new_requests ?? defaultSettings.pushNewRequests,
                pushNewMessages: data.settings.push_new_messages ?? defaultSettings.pushNewMessages,
                pushStatusChanges: data.settings.push_status_changes ?? defaultSettings.pushStatusChanges,
                emailNewRequests: data.settings.email_new_requests ?? defaultSettings.emailNewRequests,
                emailNewMessages: data.settings.email_new_messages ?? defaultSettings.emailNewMessages,
                emailDigest: data.settings.email_digest ?? defaultSettings.emailDigest,
                emailDigestFrequency: data.settings.email_digest_frequency ?? defaultSettings.emailDigestFrequency,
                quietHoursEnabled: data.settings.quiet_hours_enabled ?? defaultSettings.quietHoursEnabled,
                quietHoursStart: data.settings.quiet_hours_start ?? defaultSettings.quietHoursStart,
                quietHoursEnd: data.settings.quiet_hours_end ?? defaultSettings.quietHoursEnd,
              };
              setSettings({ ...defaultSettings, ...serverSettings });
              // Also update localStorage to keep in sync
              localStorage.setItem("notification-settings", JSON.stringify({ ...defaultSettings, ...serverSettings }));
              setIsLoadingSettings(false);
              return;
            }
          }
        }

        // Fallback to localStorage
        const savedSettings = localStorage.getItem("notification-settings");
        if (savedSettings) {
          setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
        }
      } catch (e) {
        console.error("Error loading settings:", e);
        // Fallback to localStorage on error
        const savedSettings = localStorage.getItem("notification-settings");
        if (savedSettings) {
          try {
            setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
          } catch {
            // Use defaults if localStorage is corrupted
          }
        }
      } finally {
        setIsLoadingSettings(false);
      }
    }

    if (!authLoading) {
      loadSettings();
    }
  }, [authLoading, isAuthenticated, user]);

  // Handle auth state and push notifications setup
  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setShowLoginModal(true);
    }

    const supported = isPushSupported();
    setPushSupported(supported);

    if (supported) {
      setPushPermission(getNotificationPermission());
      registerServiceWorker();
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
      const permission = await requestNotificationPermission();
      setPushPermission(permission);

      if (permission === "granted") {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (vapidPublicKey && user) {
          const subscription = await subscribeToPush(vapidPublicKey);
          if (subscription) {
            await fetch("/api/notifications/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                subscription: subscription.toJSON(),
              }),
            });
          }
        }
        setSettings(prev => ({ ...prev, pushEnabled: true }));
      }
    } else {
      await unsubscribeFromPush();
      setSettings(prev => ({ ...prev, pushEnabled: false }));
    }
  };

  const handleSettingChange = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      localStorage.setItem("notification-settings", JSON.stringify(settings));

      if (user) {
        await fetch("/api/notifications/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ settings }),
        });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoadingSettings) {
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
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Харагдац</h2>
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
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Push мэдэгдэл</h2>
          </div>

          <div className="bg-card rounded-2xl border overflow-hidden">
            <SettingItem
              icon={settings.pushEnabled && pushPermission === "granted" ? Bell : BellOff}
              iconColor={settings.pushEnabled && pushPermission === "granted" ? "bg-green-500" : "bg-gray-400"}
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
                disabled={!pushSupported || pushPermission === "denied"}
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
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Имэйл мэдэгдэл</h2>
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
                      onValueChange={(v) => handleSettingChange("emailDigestFrequency", v as "daily" | "weekly" | "never")}
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
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Тайван цаг</h2>
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
      <LoginPromptModal
        open={showLoginModal}
        onOpenChange={handleLoginModalClose}
      />
    </div>
  );
}
