"use client";

import * as React from "react";
import {
  useFindUniqueprofiles_notification_settings,
  useUpsertprofiles_notification_settings,
} from "@/lib/hooks";
import { useAuth } from "@/contexts/auth-context";

export interface NotificationSettings {
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

export const defaultSettings: NotificationSettings = {
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

/**
 * Hook for managing notification settings using ZenStack
 * Replaces /api/notifications/settings API calls
 */
export function useNotificationSettings() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [localSettings, setLocalSettings] = React.useState<NotificationSettings>(defaultSettings);
  const [hasLoadedFromServer, setHasLoadedFromServer] = React.useState(false);

  // Fetch settings from server using ZenStack hook
  const {
    data: serverSettings,
    isLoading: isLoadingServer,
    refetch,
  } = useFindUniqueprofiles_notification_settings(
    {
      where: { user_id: user?.id || "" },
    },
    {
      enabled: !!user?.id && isAuthenticated,
    }
  );

  // Upsert mutation
  const upsertSettings = useUpsertprofiles_notification_settings();

  // Map server data to local format
  React.useEffect(() => {
    if (serverSettings && !hasLoadedFromServer) {
      const mapped: NotificationSettings = {
        pushEnabled: serverSettings.push_enabled ?? defaultSettings.pushEnabled,
        emailEnabled: serverSettings.email_enabled ?? defaultSettings.emailEnabled,
        pushNewRequests: serverSettings.push_new_requests ?? defaultSettings.pushNewRequests,
        pushNewMessages: serverSettings.push_new_messages ?? defaultSettings.pushNewMessages,
        pushStatusChanges: serverSettings.push_status_changes ?? defaultSettings.pushStatusChanges,
        emailNewRequests: serverSettings.email_new_requests ?? defaultSettings.emailNewRequests,
        emailNewMessages: serverSettings.email_new_messages ?? defaultSettings.emailNewMessages,
        emailDigest: serverSettings.email_digest ?? defaultSettings.emailDigest,
        emailDigestFrequency:
          (serverSettings.email_digest_frequency as NotificationSettings["emailDigestFrequency"]) ??
          defaultSettings.emailDigestFrequency,
        quietHoursEnabled: serverSettings.quiet_hours_enabled ?? defaultSettings.quietHoursEnabled,
        quietHoursStart: serverSettings.quiet_hours_start ?? defaultSettings.quietHoursStart,
        quietHoursEnd: serverSettings.quiet_hours_end ?? defaultSettings.quietHoursEnd,
      };
      setLocalSettings(mapped);
      // Also sync to localStorage
      localStorage.setItem("notification-settings", JSON.stringify(mapped));
      setHasLoadedFromServer(true);
    }
  }, [serverSettings, hasLoadedFromServer]);

  // Load from localStorage if not authenticated
  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const saved = localStorage.getItem("notification-settings");
      if (saved) {
        try {
          setLocalSettings({ ...defaultSettings, ...JSON.parse(saved) });
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, [authLoading, isAuthenticated]);

  // Update a single setting
  const updateSetting = React.useCallback(
    <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => {
      setLocalSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  // Save all settings
  const saveSettings = React.useCallback(async () => {
    // Save to localStorage first
    localStorage.setItem("notification-settings", JSON.stringify(localSettings));

    // If authenticated, save to server using ZenStack
    if (user?.id && isAuthenticated) {
      await upsertSettings.mutateAsync({
        where: { user_id: user.id },
        create: {
          user_id: user.id,
          push_enabled: localSettings.pushEnabled,
          push_new_requests: localSettings.pushNewRequests,
          push_new_messages: localSettings.pushNewMessages,
          push_status_changes: localSettings.pushStatusChanges,
          email_enabled: localSettings.emailEnabled,
          email_new_requests: localSettings.emailNewRequests,
          email_new_messages: localSettings.emailNewMessages,
          email_digest: localSettings.emailDigest,
          email_digest_frequency: localSettings.emailDigestFrequency,
          quiet_hours_enabled: localSettings.quietHoursEnabled,
          quiet_hours_start: localSettings.quietHoursStart,
          quiet_hours_end: localSettings.quietHoursEnd,
        },
        update: {
          push_enabled: localSettings.pushEnabled,
          push_new_requests: localSettings.pushNewRequests,
          push_new_messages: localSettings.pushNewMessages,
          push_status_changes: localSettings.pushStatusChanges,
          email_enabled: localSettings.emailEnabled,
          email_new_requests: localSettings.emailNewRequests,
          email_new_messages: localSettings.emailNewMessages,
          email_digest: localSettings.emailDigest,
          email_digest_frequency: localSettings.emailDigestFrequency,
          quiet_hours_enabled: localSettings.quietHoursEnabled,
          quiet_hours_start: localSettings.quietHoursStart,
          quiet_hours_end: localSettings.quietHoursEnd,
        },
      });

      // Refetch to sync
      refetch();
    }
  }, [localSettings, user?.id, isAuthenticated, upsertSettings, refetch]);

  return {
    settings: localSettings,
    updateSetting,
    saveSettings,
    isLoading: authLoading || (isAuthenticated && isLoadingServer && !hasLoadedFromServer),
    isSaving: upsertSettings.isPending,
    refetch,
  };
}
