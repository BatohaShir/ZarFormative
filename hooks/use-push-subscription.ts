"use client";

import * as React from "react";
import {
  useCreateprofiles_push_subscriptions,
  useDeleteManyprofiles_push_subscriptions,
  useFindFirstprofiles_push_subscriptions,
} from "@/lib/hooks";
import { useAuth } from "@/contexts/auth-context";
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  registerServiceWorker,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/notifications";

/**
 * Hook for managing push subscriptions using ZenStack
 * Replaces /api/notifications/subscribe and /api/notifications/unsubscribe
 */
export function usePushSubscription() {
  const { user, isAuthenticated } = useAuth();
  const [isSupported, setIsSupported] = React.useState(false);
  const [permission, setPermission] = React.useState<NotificationPermission | "unsupported">(
    "default"
  );
  const [isLoading, setIsLoading] = React.useState(false);

  // ZenStack mutations
  const createSubscription = useCreateprofiles_push_subscriptions();
  const deleteSubscriptions = useDeleteManyprofiles_push_subscriptions();

  // Check for existing subscription
  const { data: existingSubscription, refetch } = useFindFirstprofiles_push_subscriptions(
    {
      where: { user_id: user?.id || "" },
    },
    {
      enabled: !!user?.id && isAuthenticated,
    }
  );

  // Initialize on mount
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

  // Subscribe to push notifications
  const subscribe = React.useCallback(async () => {
    if (!isSupported || !user?.id) return false;

    setIsLoading(true);
    try {
      // Request permission
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);

      if (newPermission === "granted") {
        // Subscribe to push
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (vapidPublicKey) {
          const subscription = await subscribeToPush(vapidPublicKey);
          if (subscription) {
            const subJson = subscription.toJSON();
            const endpoint = subJson.endpoint || "";

            // First delete any existing subscriptions for this user
            // (to handle re-subscription with new endpoint)
            try {
              await deleteSubscriptions.mutateAsync({
                where: { user_id: user.id },
              });
            } catch {
              // Ignore if no existing subscriptions
            }

            // Create new subscription
            await createSubscription.mutateAsync({
              data: {
                user_id: user.id,
                endpoint: endpoint,
                p256dh: subJson.keys?.p256dh || null,
                auth: subJson.keys?.auth || null,
              },
            });

            refetch();
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      console.error("Error subscribing to push:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user?.id, createSubscription, deleteSubscriptions, refetch]);

  // Unsubscribe from push notifications
  const unsubscribe = React.useCallback(async () => {
    if (!user?.id) return false;

    setIsLoading(true);
    try {
      // Unsubscribe from browser
      await unsubscribeFromPush();

      // Delete from DB using ZenStack
      await deleteSubscriptions.mutateAsync({
        where: { user_id: user.id },
      });

      refetch();
      return true;
    } catch (error) {
      console.error("Error unsubscribing from push:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, deleteSubscriptions, refetch]);

  return {
    isSupported,
    permission,
    isSubscribed: !!existingSubscription,
    isLoading: isLoading || createSubscription.isPending || deleteSubscriptions.isPending,
    subscribe,
    unsubscribe,
  };
}
