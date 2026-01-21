"use client";

import * as React from "react";
import { Bell, BellOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { usePushSubscription } from "@/hooks/use-push-subscription";

interface NotificationPromptProps {
  variant?: "banner" | "modal" | "inline";
  onClose?: () => void;
}

export function NotificationPrompt({ variant = "banner", onClose }: NotificationPromptProps) {
  const { isAuthenticated } = useAuth();
  const { isSupported, permission, isLoading, subscribe } = usePushSubscription();
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    // Check if user has dismissed the prompt
    const isDismissed = localStorage.getItem("notification-prompt-dismissed") === "true";
    setDismissed(isDismissed);
  }, []);

  const handleEnableNotifications = async () => {
    const success = await subscribe();
    if (success) {
      // Close prompt on success
      onClose?.();
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("notification-prompt-dismissed", "true");
    setDismissed(true);
    onClose?.();
  };

  // Don't show if not authenticated, not supported, already granted, or dismissed
  if (
    !isAuthenticated ||
    !isSupported ||
    permission === "granted" ||
    permission === "unsupported" ||
    dismissed
  ) {
    return null;
  }

  // Don't show if user denied - they need to enable in browser settings
  if (permission === "denied") {
    return null;
  }

  if (variant === "banner") {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-card border rounded-xl shadow-lg p-4 z-50 animate-in slide-in-from-bottom-5">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 hover:bg-muted rounded-full transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm mb-1">Мэдэгдэл идэвхжүүлэх</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Шинэ захиалга, мессеж ирэхэд шууд мэдэгдэл авах
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleEnableNotifications}
                disabled={isLoading}
                className="text-xs h-8"
              >
                {isLoading ? "Уншиж байна..." : "Идэвхжүүлэх"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="text-xs h-8"
              >
                Дараа
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Push мэдэгдэл</p>
            <p className="text-xs text-muted-foreground">
              Шинэ захиалга, мессеж ирэхэд мэдэгдэл авах
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleEnableNotifications}
          disabled={isLoading}
        >
          {isLoading ? "..." : "Идэвхжүүлэх"}
        </Button>
      </div>
    );
  }

  return null;
}

// Notification toggle for settings page
interface NotificationToggleProps {
  className?: string;
}

export function NotificationToggle({ className }: NotificationToggleProps) {
  const { isSupported, permission, isLoading, subscribe } = usePushSubscription();

  const handleToggle = async () => {
    if (permission === "granted") {
      // Already enabled - show info
      return;
    }
    await subscribe();
  };

  const isEnabled = permission === "granted";
  const isDenied = permission === "denied";

  return (
    <div className={`flex items-center justify-between p-4 bg-card border rounded-lg ${className}`}>
      <div className="flex items-center gap-3">
        {isEnabled ? (
          <Bell className="h-5 w-5 text-green-500" />
        ) : (
          <BellOff className="h-5 w-5 text-muted-foreground" />
        )}
        <div>
          <p className="text-sm font-medium">Push мэдэгдэл</p>
          <p className="text-xs text-muted-foreground">
            {!isSupported
              ? "Таны браузер дэмжихгүй байна"
              : isDenied
              ? "Браузерын тохиргооноос идэвхжүүлнэ үү"
              : isEnabled
              ? "Идэвхтэй"
              : "Идэвхгүй"}
          </p>
        </div>
      </div>

      {isSupported && !isDenied && (
        <Button
          size="sm"
          variant={isEnabled ? "secondary" : "default"}
          onClick={handleToggle}
          disabled={isLoading || isEnabled}
        >
          {isLoading ? "..." : isEnabled ? "Идэвхтэй" : "Идэвхжүүлэх"}
        </Button>
      )}
    </div>
  );
}
