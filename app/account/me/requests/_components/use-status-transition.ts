/**
 * Thin client wrapper around the `transitionRequest` Server Action.
 *
 * Why this hook still exists after the action collapsed all the
 * server-side work into one round-trip:
 *
 *   1. Optimistic UI. The server-action call still pays one network
 *      hop (~200ms MN→Seoul cold). We patch the React Query cache
 *      synchronously so the action handler returns to the user
 *      already in the new state, then revert if the action fails.
 *
 *   2. Action variants. Eleven different handlers (Accept, Reject,
 *      Start, Submit, Confirm, …) need slightly different optimistic
 *      data writes (accepted_at, started_at, completion_*) and
 *      success toasts. The hook turns those into a per-call config
 *      so each handler is a small declarative block.
 *
 * Notifications and reviews are NO LONGER fired here — the Server
 * Action does them inside the same prisma.$transaction as the
 * status update, so they can never get out of sync.
 */

import * as React from "react";
import { toast } from "sonner";
import { transitionRequest, type TransitionAction } from "@/app/actions/request-transition";
import type { RequestWithRelations } from "./types";

/**
 * Per-call config for `runTransition`. The Server Action is the
 * authority on what status the request ends up in (driven by
 * `action`); `optimisticData` is purely for the cache patch the
 * UI uses while the action is in flight.
 */
export interface TransitionConfig {
  requestId: string;
  /** Discriminator the server action uses to pick state machine target + side effects. */
  action: TransitionAction;
  /** Status the optimistic patch should display. Mirrors what the server will commit. */
  toStatus: RequestWithRelations["status"];
  /** Extra columns the optimistic patch should write (accepted_at, started_at, …). */
  optimisticData?: Partial<RequestWithRelations>;
  /** Toast on success. */
  successToast: string;
  /** Closures that depend on UI state (modals, dialogs, dispatch). Run after success. */
  onSuccess?: () => void;
  // Action-specific payload forwarded verbatim to the Server Action.
  proposedPrice?: number;
  completionDescription?: string;
  completionPhotos?: string[];
  rating?: number;
  comment?: string;
}

interface RunTransitionDeps {
  /** Current list of requests; used to read the row's prior status for revert. */
  allRequests: RequestWithRelations[] | undefined;
  optimisticUpdate: (
    requestId: string,
    newStatus: RequestWithRelations["status"],
    additionalData?: Partial<RequestWithRelations>
  ) => void;
  revertOptimisticUpdate: (requestId: string, oldStatus: RequestWithRelations["status"]) => void;
}

interface UseStatusTransitionResult {
  /** Run a status transition. Returns when the action settles. */
  runTransition: (config: TransitionConfig) => Promise<void>;
  /** True while at least one transition is in flight. UI uses this to disable buttons / show spinners. */
  isPending: boolean;
}

export function useStatusTransition(deps: RunTransitionDeps): UseStatusTransitionResult {
  const { allRequests, optimisticUpdate, revertOptimisticUpdate } = deps;

  // allRequests changes every realtime patch / optimistic write.
  // Stash it in a ref so the runner stays referentially stable —
  // otherwise every memo that closes over runTransition (= the
  // 11 handlers) would invalidate on each patch.
  const allRequestsRef = React.useRef(allRequests);
  React.useEffect(() => {
    allRequestsRef.current = allRequests;
  }, [allRequests]);

  // Track in-flight count rather than a boolean so two overlapping
  // transitions (e.g. the user double-clicks during the action's
  // round-trip) don't toggle isPending off prematurely.
  const [pendingCount, setPendingCount] = React.useState(0);

  const runTransition = React.useCallback(
    async (config: TransitionConfig) => {
      const {
        requestId,
        action,
        toStatus,
        optimisticData,
        successToast,
        onSuccess,
        proposedPrice,
        completionDescription,
        completionPhotos,
        rating,
        comment,
      } = config;

      const request = allRequestsRef.current?.find((r) => r.id === requestId);
      const oldStatus = request?.status;

      // Optimistic patch lands first. UI updates synchronously; the
      // network round-trip happens behind it. The state machine on
      // the server is the only conflict guard — it naturally rejects
      // a stale transition (e.g. trying to accept a request that's
      // already accepted) without needing a per-row updated_at lock.
      optimisticUpdate(requestId, toStatus, { ...optimisticData, status: toStatus });
      setPendingCount((n) => n + 1);

      try {
        const result = await transitionRequest({
          requestId,
          action,
          proposedPrice,
          completionDescription,
          completionPhotos,
          rating,
          comment,
        });

        if (!result.ok) {
          // State machine / RBAC / conflict — revert and surface
          // the server's actual message instead of the generic
          // "Алдаа гарлаа", so the user sees *why* it didn't go
          // (e.g. "stale, refresh", "no permission").
          if (oldStatus) revertOptimisticUpdate(requestId, oldStatus);
          toast.error(result.error);
          return;
        }

        toast.success(successToast);
        onSuccess?.();
      } catch (err) {
        // Network-level failure (Server Action threw). Revert and
        // show generic message — there's no structured error here.
        if (oldStatus) revertOptimisticUpdate(requestId, oldStatus);
        console.error("transitionRequest threw:", err);
        toast.error("Алдаа гарлаа");
      } finally {
        setPendingCount((n) => Math.max(0, n - 1));
      }
    },
    [optimisticUpdate, revertOptimisticUpdate]
  );

  return { runTransition, isPending: pendingCount > 0 };
}
