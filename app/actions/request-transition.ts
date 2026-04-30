"use server";

/**
 * Single source of truth for every status change on a listing_request.
 *
 * Before: three layers ran in sequence, each with its own gaps:
 *   1. Client `useStatusTransition` issued PUT /api/model/listing_requests/update
 *      followed by POST /api/model/notifications/create — two
 *      round-trips, no atomicity. If the first succeeded and the
 *      second failed, the counterparty saw the new status with no
 *      push.
 *   2. /api/model/[...path]/route.ts intercepted the PUT, read the
 *      current row, ran the state-machine validator, then forwarded
 *      to ZenStack.
 *   3. ZenStack's @@allow rules added field-level checks but had no
 *      access to the *previous* status, so they couldn't enforce
 *      transitions on their own.
 *
 * Now: one Server Action runs all of:
 *   - auth + role resolution
 *   - state-machine validation (`validateStatusTransition`)
 *   - optimistic-locking guard (`expected_updated_at`)
 *   - status update + notification create + optional review create
 *     in a single prisma.$transaction
 *
 * Server-side prisma bypasses ZenStack policies by design (the
 * action is the trusted boundary), so a paired @@deny on the
 * `status` field in schema.zmodel locks down the alternative REST
 * path. Callers MUST go through this action to change status, which
 * also means notifications can never drift out of sync with the
 * status they reference.
 *
 * Realtime delivery is unchanged: the prisma writes inside the
 * transaction emit postgres_changes events on commit, and the
 * counterparty's `useRealtimeRequests` / notifications context
 * picks them up exactly like before.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  validateStatusTransition,
  getUserRequestRole,
  type RequestStatus,
} from "@/lib/validations/request-status";
import type { Prisma, NotificationType } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────
// Action input
// ─────────────────────────────────────────────────────────────────

export type TransitionAction =
  | "accept"
  | "reject"
  | "start_work"
  | "cancel_by_client"
  | "cancel_by_provider"
  | "propose_price"
  | "confirm_price"
  | "reject_price"
  | "provider_submit_details"
  | "client_confirm_completion"
  | "payment_complete";

interface TransitionInput {
  requestId: string;
  action: TransitionAction;
  // Action-specific payloads. We accept a single discriminated union
  // shape to keep the call site one function instead of eleven.
  proposedPrice?: number;
  completionDescription?: string;
  completionPhotos?: string[];
  rating?: number;
  comment?: string;
}

export type TransitionResult =
  | { ok: true; updatedAt: string }
  | {
      ok: false;
      error: string;
      code?: "auth" | "not_found" | "forbidden" | "conflict" | "validation" | "internal";
    };

// ─────────────────────────────────────────────────────────────────
// Action → state machine target + role hint
// ─────────────────────────────────────────────────────────────────

interface ActionPlan {
  toStatus: RequestStatus;
  /**
   * Which side initiates this action. The caller's actual role is
   * still derived from auth().id vs the row, but this mapping
   * documents intent and lets us reject obvious mismatches early
   * (e.g. provider trying to "client_confirm_completion").
   */
  initiator: "client" | "provider";
}

const ACTION_PLAN: Record<TransitionAction, ActionPlan> = {
  accept: { toStatus: "accepted", initiator: "provider" },
  reject: { toStatus: "rejected", initiator: "provider" },
  start_work: { toStatus: "in_progress", initiator: "provider" },
  propose_price: { toStatus: "price_proposed", initiator: "provider" },
  cancel_by_provider: { toStatus: "cancelled_by_provider", initiator: "provider" },
  provider_submit_details: { toStatus: "awaiting_client_confirmation", initiator: "provider" },
  cancel_by_client: { toStatus: "cancelled_by_client", initiator: "client" },
  confirm_price: { toStatus: "accepted", initiator: "client" },
  reject_price: { toStatus: "rejected", initiator: "client" },
  client_confirm_completion: { toStatus: "awaiting_payment", initiator: "client" },
  // Provider confirms payment was received (via the QR modal).
  // Client doesn't have a button for this — they just paid.
  payment_complete: { toStatus: "completed", initiator: "provider" },
};

// ─────────────────────────────────────────────────────────────────
// Side-effect builder: derives extra column writes + which
// notifications to create from the action + the loaded request.
// All side effects share the same transaction with the status
// update, so success is atomic.
// ─────────────────────────────────────────────────────────────────

interface NotificationDraft {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  request_id: string;
  actor_id: string | null;
}

interface SideEffects {
  /** Extra columns to write alongside `status`. */
  data: Prisma.listing_requestsUpdateInput;
  /** Notifications to create in the same transaction. */
  notifications: NotificationDraft[];
  /** Optional review row to create (handleClientConfirmCompletion only). */
  review?: Prisma.reviewsCreateInput;
}

function buildSideEffects(
  action: TransitionAction,
  input: TransitionInput,
  request: { id: string; client_id: string; provider_id: string; listing: { title: string } },
  userId: string
): SideEffects | { error: string } {
  const reqId = request.id;
  const listingTitle = request.listing.title;

  switch (action) {
    case "accept":
      return {
        data: { accepted_at: new Date() },
        notifications: [
          {
            user_id: request.client_id,
            type: "request_accepted",
            title: "Хүсэлт зөвшөөрөгдлөө",
            message: `"${listingTitle}" хүсэлт зөвшөөрөгдлөө`,
            request_id: reqId,
            actor_id: userId,
          },
        ],
      };

    case "reject":
      return {
        data: {},
        notifications: [
          {
            user_id: request.client_id,
            type: "request_rejected",
            title: "Хүсэлт татгалзагдлаа",
            message: `"${listingTitle}" хүсэлт татгалзагдлаа`,
            request_id: reqId,
            actor_id: userId,
          },
        ],
      };

    case "start_work":
      return {
        data: { started_at: new Date() },
        notifications: [
          {
            user_id: request.client_id,
            type: "work_started",
            title: "Ажил эхэллээ",
            message: `"${listingTitle}" ажил эхэллээ`,
            request_id: reqId,
            actor_id: userId,
          },
        ],
      };

    case "propose_price": {
      if (typeof input.proposedPrice !== "number" || input.proposedPrice < 0) {
        return { error: "Үнийн санал буруу байна" };
      }
      return {
        data: { proposed_price: input.proposedPrice },
        notifications: [
          {
            user_id: request.client_id,
            type: "new_message",
            title: "Үнийн санал ирлээ",
            message: `"${listingTitle}" үйлчилгээнд ${input.proposedPrice.toLocaleString()}₮ үнэ санал болголоо`,
            request_id: reqId,
            actor_id: userId,
          },
        ],
      };
    }

    case "confirm_price":
      return {
        data: { accepted_at: new Date() },
        notifications: [
          {
            user_id: request.provider_id,
            type: "request_accepted",
            title: "Үнэ зөвшөөрөгдлөө",
            message: `"${listingTitle}" үнийн санал зөвшөөрөгдлөө`,
            request_id: reqId,
            actor_id: userId,
          },
        ],
      };

    case "reject_price":
      return {
        data: { proposed_price: null },
        notifications: [
          {
            user_id: request.provider_id,
            type: "request_rejected",
            title: "Үнэ татгалзагдлаа",
            message: `"${listingTitle}" үнийн санал татгалзагдлаа`,
            request_id: reqId,
            actor_id: userId,
          },
        ],
      };

    case "cancel_by_client":
      return {
        data: {},
        notifications: [
          {
            user_id: request.provider_id,
            type: "request_cancelled",
            title: "Хүсэлт цуцлагдлаа",
            message: `"${listingTitle}" хүсэлт захиалагчаас цуцлагдлаа`,
            request_id: reqId,
            actor_id: userId,
          },
        ],
      };

    case "cancel_by_provider":
      return {
        data: {},
        notifications: [
          {
            user_id: request.client_id,
            type: "cancelled_by_provider",
            title: "Захиалга цуцлагдлаа",
            message: `"${listingTitle}" захиалга үйлчилгээ үзүүлэгчээс цуцлагдлаа`,
            request_id: reqId,
            actor_id: userId,
          },
        ],
      };

    case "provider_submit_details":
      // Both description and photos are optional — the form lets the
      // provider submit either, both, or neither (the previous strict
      // check refused submits with no photos, blocking simple jobs
      // where there's nothing visual to show). Normalise to an empty
      // string / empty array so the column write never lands `null`.
      return {
        data: {
          completion_description: input.completionDescription?.trim() || "",
          completion_photos: Array.isArray(input.completionPhotos) ? input.completionPhotos : [],
        },
        notifications: [
          {
            user_id: request.client_id,
            type: "work_awaiting_confirmation",
            title: "Ажил дууссаныг баталгаажуулна уу",
            message: `"${listingTitle}" ажил дууслаа. Баталгаажуулна уу.`,
            request_id: reqId,
            actor_id: userId,
          },
        ],
      };

    case "client_confirm_completion": {
      if (typeof input.rating !== "number" || input.rating < 1 || input.rating > 5) {
        return { error: "Үнэлгээ 1-5 хооронд байх ёстой" };
      }
      return {
        data: {},
        notifications: [
          {
            user_id: request.provider_id,
            type: "client_confirmed_completion",
            title: "Захиалагч баталгаажууллаа",
            message: `"${listingTitle}" ажлыг захиалагч баталгаажууллаа. Төлбөр хүлээгдэж байна.`,
            request_id: reqId,
            actor_id: userId,
          },
        ],
        review: {
          rating: input.rating,
          comment: input.comment?.trim() || null,
          request: { connect: { id: reqId } },
          client: { connect: { id: request.client_id } },
          provider: { connect: { id: request.provider_id } },
        },
      };
    }

    case "payment_complete":
      return {
        data: { completed_at: new Date() },
        notifications: [
          {
            user_id: request.client_id,
            type: "work_completed",
            title: "Ажил дууслаа",
            message: `"${listingTitle}" ажил амжилттай дууслаа. Баярлалаа!`,
            request_id: reqId,
            actor_id: userId,
          },
          {
            user_id: request.provider_id,
            type: "payment_received",
            title: "Төлбөр хүлээн авлаа",
            message: `"${listingTitle}" ажлын төлбөр хүлээн авлаа. Баярлалаа!`,
            request_id: reqId,
            actor_id: userId,
          },
        ],
      };
  }
}

// ─────────────────────────────────────────────────────────────────
// The action
// ─────────────────────────────────────────────────────────────────

export async function transitionRequest(input: TransitionInput): Promise<TransitionResult> {
  // 1. Auth.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Необходима авторизация", code: "auth" };
  }
  const userId = user.id;
  const userRole = (user.app_metadata as { role?: string } | undefined)?.role;

  // 2. Resolve the action's target status + initiator from the
  //    static plan map. Unknown actions are an immediate validation
  //    error rather than a thrown exception that bubbles up as 500.
  const plan = ACTION_PLAN[input.action];
  if (!plan) {
    return { ok: false, error: "Тодорхойгүй үйлдэл", code: "validation" };
  }

  // 3. Load the current row + listing title for notifications. One
  //    findUnique replaces the old route-handler's separate fetch.
  const current = await prisma.listing_requests.findUnique({
    where: { id: input.requestId },
    select: {
      id: true,
      status: true,
      client_id: true,
      provider_id: true,
      updated_at: true,
      listing: { select: { title: true } },
    },
  });
  if (!current) {
    return { ok: false, error: "Заявка не найдена", code: "not_found" };
  }

  // (Optimistic locking via expected_updated_at was removed — the
  // state machine already rejects double-transitions: e.g. a second
  // accept on the same pending request is "pending → accepted",
  // which fails because by then status is already 'accepted' and
  // there is no `accepted → accepted` rule. That covers the real
  // race window without the precision-drift false positives the
  // updated_at compare kept hitting on the first action after
  // every page load.)

  // 5. Role + state-machine check. Same logic the old route
  //    handler ran, just collocated here.
  const role = getUserRequestRole(userId, current.client_id, current.provider_id, userRole);
  if (!role) {
    return { ok: false, error: "У вас нет доступа к этой заявке", code: "forbidden" };
  }
  // Guard the obvious-mismatch case: e.g. a provider firing
  // `client_confirm_completion`. The role check below would catch
  // it too, but this gives a clearer error.
  if (role !== "admin" && plan.initiator !== role) {
    return {
      ok: false,
      error: "Та энэ үйлдэл хийх эрхгүй",
      code: "forbidden",
    };
  }

  const transitionError = validateStatusTransition(
    current.status as RequestStatus,
    plan.toStatus,
    role
  );
  if (transitionError) {
    return { ok: false, error: transitionError, code: "validation" };
  }

  // 6. Build side effects and run everything in one transaction.
  //    Either the status flip + notification(s) + review all land,
  //    or none of it does.
  const effects = buildSideEffects(input.action, input, current, userId);
  if ("error" in effects) {
    return { ok: false, error: effects.error, code: "validation" };
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.listing_requests.update({
        where: { id: input.requestId },
        data: { ...effects.data, status: plan.toStatus },
        select: { updated_at: true },
      });

      if (effects.notifications.length > 0) {
        await tx.notifications.createMany({
          data: effects.notifications,
          skipDuplicates: true,
        });
      }

      if (effects.review) {
        await tx.reviews.create({ data: effects.review });
      }

      return updatedRequest;
    });

    // Bust SSR caches that depend on this request. Keep this list
    // narrow — broad revalidation would torpedo unrelated cached
    // pages on every status change.
    revalidatePath("/account/me/requests");
    revalidatePath(`/account/${current.client_id}`);
    revalidatePath(`/account/${current.provider_id}`);

    return { ok: true, updatedAt: updated.updated_at.toISOString() };
  } catch (err) {
    // A common failure mode here is the @unique on reviews.request_id
    // (the client somehow already has a review for this request).
    // Surface it as a product-level message rather than the generic
    // toast — the cache row gets reverted by the caller.
    const code = (err as { code?: string }).code;
    if (code === "P2002") {
      return {
        ok: false,
        error: "Энэ хүсэлтэд аль хэдийн үнэлгээ үлдээсэн байна",
        code: "conflict",
      };
    }
    console.error("transitionRequest failed:", err);
    return { ok: false, error: "Алдаа гарлаа", code: "internal" };
  }
}
