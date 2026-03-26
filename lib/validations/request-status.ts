/**
 * Server-side validation for request status transitions.
 * Defines the valid state machine and who can perform each transition.
 */

export type RequestStatus =
  | "pending"
  | "price_proposed"
  | "accepted"
  | "rejected"
  | "in_progress"
  | "awaiting_client_confirmation"
  | "awaiting_completion_details"
  | "awaiting_payment"
  | "completed"
  | "cancelled_by_client"
  | "cancelled_by_provider"
  | "disputed";

type Role = "client" | "provider" | "admin";

interface TransitionRule {
  to: RequestStatus;
  allowedRoles: Role[];
}

/**
 * Valid status transitions map.
 * Key = current status, Value = array of valid transitions with allowed roles.
 */
const VALID_TRANSITIONS: Record<RequestStatus, TransitionRule[]> = {
  pending: [
    { to: "accepted", allowedRoles: ["provider", "admin"] },
    { to: "rejected", allowedRoles: ["provider", "admin"] },
    { to: "price_proposed", allowedRoles: ["provider", "admin"] },
    { to: "cancelled_by_client", allowedRoles: ["client", "admin"] },
    { to: "cancelled_by_provider", allowedRoles: ["provider", "admin"] },
  ],
  price_proposed: [
    { to: "accepted", allowedRoles: ["client", "admin"] }, // Client accepts proposed price
    { to: "rejected", allowedRoles: ["provider", "admin"] },
    { to: "cancelled_by_client", allowedRoles: ["client", "admin"] },
    { to: "cancelled_by_provider", allowedRoles: ["provider", "admin"] },
  ],
  accepted: [
    { to: "in_progress", allowedRoles: ["provider", "admin"] },
    { to: "cancelled_by_client", allowedRoles: ["client", "admin"] },
    { to: "cancelled_by_provider", allowedRoles: ["provider", "admin"] },
  ],
  rejected: [], // Terminal state
  in_progress: [
    { to: "awaiting_client_confirmation", allowedRoles: ["provider", "admin"] },
    { to: "disputed", allowedRoles: ["client", "provider", "admin"] },
    { to: "cancelled_by_client", allowedRoles: ["client", "admin"] },
    { to: "cancelled_by_provider", allowedRoles: ["provider", "admin"] },
  ],
  awaiting_client_confirmation: [
    { to: "awaiting_completion_details", allowedRoles: ["client", "admin"] },
    { to: "disputed", allowedRoles: ["client", "admin"] },
    { to: "in_progress", allowedRoles: ["client", "admin"] }, // Client rejects completion
  ],
  awaiting_completion_details: [
    { to: "awaiting_payment", allowedRoles: ["provider", "admin"] },
    { to: "disputed", allowedRoles: ["client", "provider", "admin"] },
  ],
  awaiting_payment: [
    { to: "completed", allowedRoles: ["client", "admin"] },
    { to: "disputed", allowedRoles: ["client", "provider", "admin"] },
  ],
  completed: [], // Terminal state
  cancelled_by_client: [], // Terminal state
  cancelled_by_provider: [], // Terminal state
  disputed: [
    { to: "in_progress", allowedRoles: ["admin"] }, // Admin resolves dispute
    { to: "completed", allowedRoles: ["admin"] },
    { to: "cancelled_by_client", allowedRoles: ["admin"] },
    { to: "cancelled_by_provider", allowedRoles: ["admin"] },
  ],
};

/**
 * Determine the user's role relative to this request.
 */
export function getUserRequestRole(
  userId: string,
  clientId: string,
  providerId: string,
  userRole?: string
): Role | null {
  if (userRole === "admin") return "admin";
  if (userId === clientId) return "client";
  if (userId === providerId) return "provider";
  return null;
}

/**
 * Validate whether a status transition is allowed.
 * Returns null if valid, or an error message if invalid.
 */
export function validateStatusTransition(
  currentStatus: RequestStatus,
  newStatus: RequestStatus,
  role: Role
): string | null {
  if (currentStatus === newStatus) {
    return null; // No change, allow
  }

  const transitions = VALID_TRANSITIONS[currentStatus];
  if (!transitions || transitions.length === 0) {
    return `Статус "${currentStatus}" является конечным и не может быть изменён`;
  }

  const validTransition = transitions.find((t) => t.to === newStatus);
  if (!validTransition) {
    return `Переход из "${currentStatus}" в "${newStatus}" невозможен`;
  }

  if (!validTransition.allowedRoles.includes(role)) {
    return `У вас нет прав для изменения статуса из "${currentStatus}" в "${newStatus}"`;
  }

  return null; // Valid
}

/**
 * Check if a status is terminal (no further transitions possible).
 */
export function isTerminalStatus(status: RequestStatus): boolean {
  const transitions = VALID_TRANSITIONS[status];
  return !transitions || transitions.length === 0;
}
