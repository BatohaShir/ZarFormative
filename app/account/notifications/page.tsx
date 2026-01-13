"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, BellOff, Mail, MessageSquare, FileText, Clock, Moon } from "lucide-react";
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
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  registerServiceWorker,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/notifications";

interface NotificationSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  // Push notification types
  pushNewRequests: boolean;
  pushNewMessages: boolean;
  pushStatusChanges: boolean;
  // Email notification types
  emailNewRequests: boolean;
  emailNewMessages: boolean;
  emailDigest: boolean;
  // Email frequency
  emailDigestFrequency: "daily" | "weekly" | "never";
  // Quiet hours
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

export default function NotificationSettingsPage() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [settings, setSettings] = React.useState<NotificationSettings>(defaultSettings);
  const [isSaving, setIsSaving] = React.useState(false);
  const [pushSupported, setPushSupported] = React.useState(false);
  const [pushPermission, setPushPermission] = React.useState<NotificationPermission | "unsupported">("default");

  // Check auth and push support
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

    // Load saved settings
    const savedSettings = localStorage.getItem("notification-settings");
    if (savedSettings) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
      } catch (e) {
        console.error("Error loading settings:", e);
      }
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
      // Request permission
      const permission = await requestNotificationPermission();
      setPushPermission(permission);

      if (permission === "granted") {
        // Subscribe to push
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (vapidPublicKey && user) {
          const subscription = await subscribeToPush(vapidPublicKey);
          if (subscription) {
            // Save to backend
            await fetch("/api/notifications/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                subscription: subscription.toJSON(),
                userId: user.id,
              }),
            });
          }
        }
        setSettings(prev => ({ ...prev, pushEnabled: true }));
      }
    } else {
      // Unsubscribe
      await unsubscribeFromPush();
      if (user) {
        await fetch("/api/notifications/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        });
      }
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
    try {
      // Save to localStorage
      localStorage.setItem("notification-settings", JSON.stringify(settings));

      // Save to backend if authenticated
      if (user) {
        await fetch("/api/notifications/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            settings,
          }),
        });
      }

      // Show success feedback
      alert("Тохиргоо хадгалагдлаа");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Алдаа гарлаа");
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Уншиж байна...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-14 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">Мэдэгдлийн тохиргоо</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Push Notifications Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Push мэдэгдэл</h2>
          </div>

          <div className="space-y-4">
            {/* Main Push Toggle */}
            <div className="flex items-center justify-between p-4 bg-card border rounded-lg">
              <div className="flex items-center gap-3">
                {settings.pushEnabled && pushPermission === "granted" ? (
                  <Bell className="h-5 w-5 text-green-500" />
                ) : (
                  <BellOff className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <Label className="text-sm font-medium">Push мэдэгдэл идэвхжүүлэх</Label>
                  <p className="text-xs text-muted-foreground">
                    {!pushSupported
                      ? "Таны браузер дэмжихгүй байна"
                      : pushPermission === "denied"
                      ? "Браузерын тохиргооноос идэвхжүүлнэ үү"
                      : "Браузерт шууд мэдэгдэл авах"}
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.pushEnabled && pushPermission === "granted"}
                onCheckedChange={handlePushToggle}
                disabled={!pushSupported || pushPermission === "denied"}
              />
            </div>

            {/* Push notification types */}
            {settings.pushEnabled && pushPermission === "granted" && (
              <div className="ml-4 space-y-3 border-l-2 border-muted pl-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm">Шинэ захиалга</Label>
                  </div>
                  <Switch
                    checked={settings.pushNewRequests}
                    onCheckedChange={(v) => handleSettingChange("pushNewRequests", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm">Шинэ мессеж</Label>
                  </div>
                  <Switch
                    checked={settings.pushNewMessages}
                    onCheckedChange={(v) => handleSettingChange("pushNewMessages", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm">Статус өөрчлөлт</Label>
                  </div>
                  <Switch
                    checked={settings.pushStatusChanges}
                    onCheckedChange={(v) => handleSettingChange("pushStatusChanges", v)}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Email Notifications Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Имэйл мэдэгдэл</h2>
          </div>

          <div className="space-y-4">
            {/* Main Email Toggle */}
            <div className="flex items-center justify-between p-4 bg-card border rounded-lg">
              <div>
                <Label className="text-sm font-medium">Имэйл мэдэгдэл идэвхжүүлэх</Label>
                <p className="text-xs text-muted-foreground">
                  Имэйлээр мэдэгдэл авах
                </p>
              </div>
              <Switch
                checked={settings.emailEnabled}
                onCheckedChange={(v) => handleSettingChange("emailEnabled", v)}
              />
            </div>

            {/* Email notification types */}
            {settings.emailEnabled && (
              <div className="ml-4 space-y-3 border-l-2 border-muted pl-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm">Шинэ захиалга</Label>
                  </div>
                  <Switch
                    checked={settings.emailNewRequests}
                    onCheckedChange={(v) => handleSettingChange("emailNewRequests", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm">Шинэ мессеж (оффлайн үед)</Label>
                  </div>
                  <Switch
                    checked={settings.emailNewMessages}
                    onCheckedChange={(v) => handleSettingChange("emailNewMessages", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm">Өдрийн тойм</Label>
                  </div>
                  <Switch
                    checked={settings.emailDigest}
                    onCheckedChange={(v) => handleSettingChange("emailDigest", v)}
                  />
                </div>

                {settings.emailDigest && (
                  <div className="flex items-center justify-between pt-2">
                    <Label className="text-sm text-muted-foreground">Тоймын давтамж</Label>
                    <Select
                      value={settings.emailDigestFrequency}
                      onValueChange={(v) => handleSettingChange("emailDigestFrequency", v as "daily" | "weekly" | "never")}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Өдөр бүр</SelectItem>
                        <SelectItem value="weekly">7 хоног бүр</SelectItem>
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
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Moon className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Тайван цаг</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-card border rounded-lg">
              <div>
                <Label className="text-sm font-medium">Тайван цаг идэвхжүүлэх</Label>
                <p className="text-xs text-muted-foreground">
                  Тодорхой цагт мэдэгдэл хаах
                </p>
              </div>
              <Switch
                checked={settings.quietHoursEnabled}
                onCheckedChange={(v) => handleSettingChange("quietHoursEnabled", v)}
              />
            </div>

            {settings.quietHoursEnabled && (
              <div className="ml-4 border-l-2 border-muted pl-4 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Эхлэх цаг</Label>
                    <input
                      type="time"
                      value={settings.quietHoursStart}
                      onChange={(e) => handleSettingChange("quietHoursStart", e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Дуусах цаг</Label>
                    <input
                      type="time"
                      value={settings.quietHoursEnd}
                      onChange={(e) => handleSettingChange("quietHoursEnd", e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Save Button */}
        <Button
          className="w-full"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "Хадгалж байна..." : "Хадгалах"}
        </Button>
      </div>

      {/* Login Modal */}
      <LoginPromptModal
        open={showLoginModal}
        onOpenChange={handleLoginModalClose}
      />
    </div>
  );
}
