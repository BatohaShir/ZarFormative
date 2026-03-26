import {
  validateStatusTransition,
  getUserRequestRole,
  isTerminalStatus,
  type RequestStatus,
} from "@/lib/validations/request-status";

describe("validateStatusTransition", () => {
  describe("valid transitions", () => {
    it("allows provider to accept a pending request", () => {
      const result = validateStatusTransition("pending", "accepted", "provider");
      expect(result).toBeNull();
    });

    it("allows provider to reject a pending request", () => {
      const result = validateStatusTransition("pending", "rejected", "provider");
      expect(result).toBeNull();
    });

    it("allows provider to propose a price for a pending request", () => {
      const result = validateStatusTransition("pending", "price_proposed", "provider");
      expect(result).toBeNull();
    });

    it("allows client to cancel a pending request", () => {
      const result = validateStatusTransition("pending", "cancelled_by_client", "client");
      expect(result).toBeNull();
    });

    it("allows client to accept a proposed price", () => {
      const result = validateStatusTransition("price_proposed", "accepted", "client");
      expect(result).toBeNull();
    });

    it("allows provider to start work on an accepted request", () => {
      const result = validateStatusTransition("accepted", "in_progress", "provider");
      expect(result).toBeNull();
    });

    it("allows provider to request client confirmation when in progress", () => {
      const result = validateStatusTransition(
        "in_progress",
        "awaiting_client_confirmation",
        "provider"
      );
      expect(result).toBeNull();
    });

    it("allows client to confirm and move to awaiting completion details", () => {
      const result = validateStatusTransition(
        "awaiting_client_confirmation",
        "awaiting_completion_details",
        "client"
      );
      expect(result).toBeNull();
    });

    it("allows client to reject completion and return to in_progress", () => {
      const result = validateStatusTransition(
        "awaiting_client_confirmation",
        "in_progress",
        "client"
      );
      expect(result).toBeNull();
    });

    it("allows provider to move to awaiting payment after completion details", () => {
      const result = validateStatusTransition(
        "awaiting_completion_details",
        "awaiting_payment",
        "provider"
      );
      expect(result).toBeNull();
    });

    it("allows client to complete after payment", () => {
      const result = validateStatusTransition("awaiting_payment", "completed", "client");
      expect(result).toBeNull();
    });

    it("allows admin to resolve a dispute by completing", () => {
      const result = validateStatusTransition("disputed", "completed", "admin");
      expect(result).toBeNull();
    });

    it("allows admin to resolve a dispute by returning to in_progress", () => {
      const result = validateStatusTransition("disputed", "in_progress", "admin");
      expect(result).toBeNull();
    });

    it("allows same status transition (no-op)", () => {
      const result = validateStatusTransition("pending", "pending", "client");
      expect(result).toBeNull();
    });
  });

  describe("invalid transitions", () => {
    it("rejects completed to pending", () => {
      const result = validateStatusTransition("completed", "pending", "admin");
      expect(result).not.toBeNull();
    });

    it("rejects rejected to accepted", () => {
      const result = validateStatusTransition("rejected", "accepted", "provider");
      expect(result).not.toBeNull();
    });

    it("rejects pending directly to in_progress", () => {
      const result = validateStatusTransition("pending", "in_progress", "provider");
      expect(result).not.toBeNull();
    });

    it("rejects pending directly to completed", () => {
      const result = validateStatusTransition("pending", "completed", "provider");
      expect(result).not.toBeNull();
    });

    it("rejects cancelled_by_client to any status", () => {
      const result = validateStatusTransition("cancelled_by_client", "pending", "admin");
      expect(result).not.toBeNull();
    });

    it("rejects cancelled_by_provider to any status", () => {
      const result = validateStatusTransition("cancelled_by_provider", "in_progress", "admin");
      expect(result).not.toBeNull();
    });

    it("rejects in_progress directly to completed", () => {
      const result = validateStatusTransition("in_progress", "completed", "provider");
      expect(result).not.toBeNull();
    });

    it("rejects accepted directly to completed", () => {
      const result = validateStatusTransition("accepted", "completed", "provider");
      expect(result).not.toBeNull();
    });
  });

  describe("role-based permissions", () => {
    it("rejects client accepting a pending request (only provider can)", () => {
      const result = validateStatusTransition("pending", "accepted", "client");
      expect(result).not.toBeNull();
    });

    it("rejects provider confirming client confirmation step", () => {
      const result = validateStatusTransition(
        "awaiting_client_confirmation",
        "awaiting_completion_details",
        "provider"
      );
      expect(result).not.toBeNull();
    });

    it("rejects client starting work on accepted request", () => {
      const result = validateStatusTransition("accepted", "in_progress", "client");
      expect(result).not.toBeNull();
    });

    it("rejects client completing payment step (only client can, so provider should fail)", () => {
      const result = validateStatusTransition("awaiting_payment", "completed", "provider");
      expect(result).not.toBeNull();
    });

    it("rejects non-admin resolving disputes", () => {
      const clientResult = validateStatusTransition("disputed", "in_progress", "client");
      const providerResult = validateStatusTransition("disputed", "in_progress", "provider");
      expect(clientResult).not.toBeNull();
      expect(providerResult).not.toBeNull();
    });

    it("allows admin to perform any valid transition", () => {
      expect(validateStatusTransition("pending", "accepted", "admin")).toBeNull();
      expect(validateStatusTransition("accepted", "in_progress", "admin")).toBeNull();
      expect(validateStatusTransition("disputed", "completed", "admin")).toBeNull();
    });

    it("rejects provider cancelling as client", () => {
      const result = validateStatusTransition("pending", "cancelled_by_client", "provider");
      expect(result).not.toBeNull();
    });

    it("rejects client cancelling as provider", () => {
      const result = validateStatusTransition("pending", "cancelled_by_provider", "client");
      expect(result).not.toBeNull();
    });
  });

  describe("terminal states", () => {
    const terminalStatuses: RequestStatus[] = [
      "completed",
      "rejected",
      "cancelled_by_client",
      "cancelled_by_provider",
    ];

    it.each(terminalStatuses)("rejects any transition from terminal status '%s'", (status) => {
      const result = validateStatusTransition(status, "pending", "admin");
      expect(result).not.toBeNull();
      expect(result).toContain("конечным");
    });
  });
});

describe("getUserRequestRole", () => {
  const clientId = "user-client-123";
  const providerId = "user-provider-456";

  it("returns 'client' when userId matches clientId", () => {
    const role = getUserRequestRole(clientId, clientId, providerId);
    expect(role).toBe("client");
  });

  it("returns 'provider' when userId matches providerId", () => {
    const role = getUserRequestRole(providerId, clientId, providerId);
    expect(role).toBe("provider");
  });

  it("returns 'admin' when userRole is admin", () => {
    const role = getUserRequestRole("random-user", clientId, providerId, "admin");
    expect(role).toBe("admin");
  });

  it("returns 'admin' even if userId matches clientId when userRole is admin", () => {
    const role = getUserRequestRole(clientId, clientId, providerId, "admin");
    expect(role).toBe("admin");
  });

  it("returns null when userId matches neither clientId nor providerId", () => {
    const role = getUserRequestRole("unknown-user", clientId, providerId);
    expect(role).toBeNull();
  });

  it("returns null when userId matches neither and userRole is not admin", () => {
    const role = getUserRequestRole("unknown-user", clientId, providerId, "user");
    expect(role).toBeNull();
  });
});

describe("isTerminalStatus", () => {
  it("returns true for completed", () => {
    expect(isTerminalStatus("completed")).toBe(true);
  });

  it("returns true for rejected", () => {
    expect(isTerminalStatus("rejected")).toBe(true);
  });

  it("returns true for cancelled_by_client", () => {
    expect(isTerminalStatus("cancelled_by_client")).toBe(true);
  });

  it("returns true for cancelled_by_provider", () => {
    expect(isTerminalStatus("cancelled_by_provider")).toBe(true);
  });

  it("returns false for pending", () => {
    expect(isTerminalStatus("pending")).toBe(false);
  });

  it("returns false for accepted", () => {
    expect(isTerminalStatus("accepted")).toBe(false);
  });

  it("returns false for in_progress", () => {
    expect(isTerminalStatus("in_progress")).toBe(false);
  });

  it("returns false for price_proposed", () => {
    expect(isTerminalStatus("price_proposed")).toBe(false);
  });

  it("returns false for awaiting_client_confirmation", () => {
    expect(isTerminalStatus("awaiting_client_confirmation")).toBe(false);
  });

  it("returns false for awaiting_completion_details", () => {
    expect(isTerminalStatus("awaiting_completion_details")).toBe(false);
  });

  it("returns false for awaiting_payment", () => {
    expect(isTerminalStatus("awaiting_payment")).toBe(false);
  });

  it("returns false for disputed", () => {
    expect(isTerminalStatus("disputed")).toBe(false);
  });
});
