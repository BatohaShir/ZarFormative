"use client";

import { useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

// Тип для записи listing_requests из payload
interface ListingRequestPayload {
  id: string;
  client_id: string;
  provider_id: string;
  status: string;
  completion_description?: string | null;
  completion_photos?: string[] | null;
  [key: string]: unknown;
}

// Allowlist of scalar columns the cache row carries. postgres_changes
// payloads include EVERY scalar column on the table (including ones we
// don't surface in SSR like `note`), and a naive {...r, ...fresh}
// merge would inject extras into the cached row — harmless at runtime
// but not type-safe and easy to mistake for "available data" in the UI.
// Only the fields below get merged on a realtime UPDATE.
const PATCHABLE_FIELDS = new Set([
  "status",
  "provider_response",
  "image_url",
  "preferred_date",
  "preferred_time",
  "updated_at",
  "accepted_at",
  "started_at",
  "completed_at",
  "completion_description",
  "completion_photos",
  "proposed_price",
  "aimag_id",
  "district_id",
  "khoroo_id",
  "address_detail",
  "latitude",
  "longitude",
  "client_phone",
]);

// Сообщения о статусах на монгольском
const STATUS_MESSAGES: Record<string, { title: string; description: string }> = {
  accepted: {
    title: "Хүсэлт батлагдлаа",
    description: "Үйлчилгээ үзүүлэгч таны хүсэлтийг зөвшөөрлөө",
  },
  rejected: {
    title: "Хүсэлт татгалзлаа",
    description: "Үйлчилгээ үзүүлэгч хүсэлтийг татгалзлаа",
  },
  in_progress: {
    title: "Ажил эхэллээ",
    description: "Үйлчилгээ үзүүлэгч ажиллаж эхэллээ",
  },
  awaiting_client_confirmation: {
    title: "Баталгаажуулалт хүлээж байна",
    description: "Үйлчилгээ үзүүлэгч ажлаа дуусгасан гэж мэдэгдлээ",
  },
  awaiting_payment: {
    title: "Төлбөр хүлээгдэж байна",
    description: "Ажил баталгаажсан, төлбөр хийнэ үү",
  },
  completed: {
    title: "Дууссан",
    description: "Хүсэлт амжилттай дууссан",
  },
  cancelled: {
    title: "Цуцлагдсан",
    description: "Хүсэлт цуцлагдлаа",
  },
};

/**
 * Realtime listing_requests sync for /account/me/requests.
 *
 * Previously every incoming event did
 *   invalidateQueries({queryKey: ['listing_requests']}) +
 *   refetchQueries({..., type: 'active'})
 * which meant each status change round-tripped to Seoul to pull
 * ~50 rows with 6 joins. Visibly laggy. Now we patch the cache in
 * place:
 *
 *   UPDATE → merge the realtime payload onto the matching row.
 *     The realtime payload is shallow (no joins) but the cached
 *     row already has all the relation data from SSR; only the
 *     fields the DB actually changed move. Zero round-trips.
 *
 *   DELETE → filter the row out of every findMany cache slot.
 *
 *   INSERT → we don't have the joins (listing/client/provider) in
 *     the payload. Fall back to invalidating the list query so it
 *     reloads once. INSERTs are rare relative to UPDATEs in this
 *     flow (clients submitting new requests vs providers
 *     accepting/rejecting/completing).
 *
 * Toast logic is unchanged: only the counterparty gets the status
 * toast so the person who triggered the action doesn't get a
 * self-directed notification.
 */
export function useRealtimeRequests(options?: {
  showToasts?: boolean;
  onStatusChange?: (requestId: string, newStatus: string, oldStatus: string | null) => void;
}) {
  const { showToasts = true, onStatusChange } = options || {};
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  // Refs for stable callbacks
  const onStatusChangeRef = useRef(onStatusChange);
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  // Patch every listing_requests findMany cache slot with a merged
  // version of the changed row. No REST round-trip — the slot just
  // ships with fresh fields on the next render.
  //
  // Key prefix is ["zenstack", model, op] to match the keys ZenStack's
  // generated hooks write. TanStack Query v5's { queryKey } filter
  // uses prefix-matching from index 0, so this catches every args
  // variant (seeded payload + the hook's runtime args).
  const patchRow = useCallback(
    (fresh: ListingRequestPayload) => {
      queryClient.setQueriesData<Array<Record<string, unknown> & { id: string }>>(
        { queryKey: ["zenstack", "listing_requests", "findMany"] },
        (old) => {
          if (!old) return old;
          let changed = false;
          const next = old.map((r) => {
            if (r.id !== fresh.id) return r;
            changed = true;
            // Only merge known scalar columns (allowlist). Realtime
            // payload also carries fields like `note` that aren't in
            // the SSR shape — copying them in pollutes the cached
            // type without a UI consumer.
            const patch: Record<string, unknown> = {};
            for (const key in fresh) {
              if (PATCHABLE_FIELDS.has(key)) patch[key] = fresh[key];
            }
            return { ...r, ...patch };
          });
          return changed ? next : old;
        }
      );
    },
    [queryClient]
  );

  const removeRow = useCallback(
    (id: string) => {
      queryClient.setQueriesData<Array<Record<string, unknown> & { id: string }>>(
        { queryKey: ["zenstack", "listing_requests", "findMany"] },
        (old) => {
          if (!old) return old;
          const next = old.filter((r) => r.id !== id);
          return next.length === old.length ? old : next;
        }
      );
    },
    [queryClient]
  );

  // INSERT still needs to pull joins, so we invalidate + refetch
  // active queries for that single event. Far less common than
  // UPDATE.
  const refetchOnInsert = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["zenstack", "listing_requests", "findMany"],
      refetchType: "active",
    });
  }, [queryClient]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const supabase = createClient();
    const userId = user.id;

    // Subscribe to the whole table and filter client-side. Supabase
    // filters can silently drop events if REPLICA IDENTITY isn't set
    // right on the table; filtering here is the belt-and-braces.
    const channel = supabase
      .channel(`listing-requests-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "listing_requests",
        },
        (payload: RealtimePostgresChangesPayload<ListingRequestPayload>) => {
          const newData = payload.new as ListingRequestPayload | null;
          const oldData = payload.old as ListingRequestPayload | null;

          const isMyRequest =
            newData?.client_id === userId ||
            newData?.provider_id === userId ||
            oldData?.client_id === userId ||
            oldData?.provider_id === userId;

          if (!isMyRequest) return;

          if (payload.eventType === "INSERT") {
            // New request — payload lacks listing/client/provider
            // joins, so fall back to one refetch.
            refetchOnInsert();

            if (newData?.provider_id === userId && showToasts) {
              toast.info("Шинэ хүсэлт ирлээ", {
                description: "Шинэ үйлчилгээний хүсэлт ирлээ",
              });
            }
            return;
          }

          if (payload.eventType === "UPDATE" && newData) {
            const oldStatus = oldData?.status;
            const newStatus = newData.status;
            const requestId = newData.id;

            // Patch first — UI updates immediately with no
            // round-trip. The joined fields in cache (listing,
            // client, provider, aimag…) stay untouched; we only
            // overwrite scalar columns that the realtime payload
            // carries.
            patchRow(newData);

            if (oldStatus !== newStatus && newStatus) {
              onStatusChangeRef.current?.(requestId, newStatus, oldStatus || null);

              if (newData.client_id === userId && showToasts && STATUS_MESSAGES[newStatus]) {
                const msg = STATUS_MESSAGES[newStatus];
                toast.info(msg.title, { description: msg.description });
              }
            } else if (
              oldData &&
              (oldData.completion_description !== newData.completion_description ||
                JSON.stringify(oldData.completion_photos) !==
                  JSON.stringify(newData.completion_photos)) &&
              newData.client_id === userId &&
              showToasts
            ) {
              toast.info("Ажлын тайлан ирлээ", {
                description: "Үйлчилгээ үзүүлэгч ажлын тайлан илгээлээ",
              });
            }
            return;
          }

          if (payload.eventType === "DELETE" && oldData) {
            removeRow(oldData.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user?.id, patchRow, removeRow, refetchOnInsert, showToasts]);
}
