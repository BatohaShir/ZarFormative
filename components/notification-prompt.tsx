"use client";

import * as React from "react";
import { Bell, BellOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  registerServiceWorker,
  subscribeToPush,
} from "@/lib/notifications";
import { useAuth } from "@/contexts/auth-context";

interface NotificationPromptProps {
  variant?: "banner" | "modal" | "inline";
  onClose?: () => void;
}

export function NotificationPrompt({ variant = "banner", onClose }: NotificationPromptProps) {
  const { isAuthenticated, user } = useAuth();
  const [isSupported, setIsSupported] = React.useState(false);
  const [permission, setPermission] = React.useState<NotificationPermission | "unsupported">("default");
  const [isLoading, setIsLoading] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    // Check if push is supported
    const supported = isPushSupported();
    setIsSupported(supported);

    if (supported) {
      setPermission(getNotificationPermission());
    } else {
      setPermission("unsupported");
    }

    // Check if user has dismissed the prompt
    const isDismissed = localStorage.getItem("notification-prompt-dismissed") === "true";
    setDismissed(isDismissed);

    // Register service worker on mount
    if (supported) {
      registerServiceWorker();
    }
  }, []);

  const handleEnableNotifications = async () => {
    setIsLoading(true);

    try {
      // Request permission
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);

      if (newPermission === "granted") {
        // Subscribe to push notifications
        // Note: VAPID public key should come from environment variable
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (vapidPublicKey) {
          const subscription = await subscribeToPush(vapidPublicKey);
          if (subscription && user) {
            // Save subscription to backend
            await saveSubscriptionToBackend(subscription, user.id);
          }
        }
      }
    } catch (error) {
      console.error("Error enabling notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("notification-prompt-dismissed", "true");
    setDismissed(true);
    onClose?.();
  };

  // Don't show if not authenticated, not supported, already granted, or dismissed
  if (!isAuthenticated || !isSupported || permission === "granted" || permission === "unsupported" || dismissed) {
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
  const { isAuthenticated, user } = useAuth();
  const [isSupported, setIsSupported] = React.useState(false);
  const [permission, setPermission] = React.useState<NotificationPermission | "unsupported">("default");
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    const supported = isPushSupported();
    setIsSupported(supported);

    if (supported) {
      setPermission(getNotificationPermission());
      registerServiceWorker();
    } else {
      setPermission("unsupported");
    }
  }, []);

  const handleToggle = async () => {
    if (permission === "granted") {
      // Already enabled - show info
      return;
    }

    setIsLoading(true);

    try {
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);

      if (newPermission === "granted") {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (vapidPublicKey) {
          const subscription = await subscribeToPush(vapidPublicKey);
          if (subscription && user) {
            await saveSubscriptionToBackend(subscription, user.id);
          }
        }
      }
    } catch (error) {
      console.error("Error toggling notifications:", error);
    } finally {
      setIsLoading(false);
    }
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

// Helper function to save subscription to backend
async function saveSubscriptionToBackend(
  subscription: PushSubscription,
  userId: string
): Promise<void> {
  try {
    const response = await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userId,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to save subscription");
    }

    console.log("Subscription saved to backend");
  } catch (error) {
    console.error("Error saving subscription:", error);
  }
}
