/**
 * Tests for useStatusTransition.
 *
 * After the architecture moved status changes into the
 * `transitionRequest` Server Action, the hook's job collapsed to:
 *
 *   1. Apply optimistic UI patch with the target status + extras.
 *   2. Call the action (mocked here) with the same payload.
 *   3. On `{ok: true}` — fire onSuccess + success toast.
 *   4. On `{ok: false}` — revert to the prior status, surface the
 *      action's specific error message.
 *   5. On thrown error (network) — revert + generic toast.
 *
 * These tests pin those four branches so a regression in the hook
 * surfaces here before it ships.
 */

import * as React from "react";
import { render, act, waitFor } from "@testing-library/react";
import { useStatusTransition } from "@/app/account/me/requests/_components/use-status-transition";
import type { RequestWithRelations } from "@/app/account/me/requests/_components/types";

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

// Mock the Server Action module. Tests reach into `transitionRequest`
// via this mock to control the result the hook sees.
jest.mock("@/app/actions/request-transition", () => ({
  transitionRequest: jest.fn(),
}));

import { toast } from "sonner";
import { transitionRequest } from "@/app/actions/request-transition";

const mockTransitionRequest = transitionRequest as unknown as jest.Mock;
const mockToastSuccess = toast.success as unknown as jest.Mock;
const mockToastError = toast.error as unknown as jest.Mock;

const fakeRequest = {
  id: "req-1",
  status: "pending",
  client_id: "client-1",
  provider_id: "provider-1",
  updated_at: new Date("2026-04-26T10:00:00Z"),
  listing: { title: "Test listing" },
} as unknown as RequestWithRelations;

function harness() {
  const optimisticUpdate = jest.fn();
  const revertOptimisticUpdate = jest.fn();

  // Test harness pattern: capture the hook's return value into a
  // module-scoped slot so assertions can call it outside the
  // component. The React-Compiler lint rule flags this in production
  // code (legitimately — it's a render side effect), but the harness
  // is a Probe that renders once and is immediately torn down, so
  // the side effect is bounded and intentional.
  let api: ReturnType<typeof useStatusTransition> | null = null;

  function Probe() {
    // eslint-disable-next-line react-hooks/globals
    api = useStatusTransition({
      allRequests: [fakeRequest],
      optimisticUpdate,
      revertOptimisticUpdate,
    });
    return null;
  }

  render(<Probe />);
  if (!api) throw new Error("Hook not initialised");
  return {
    api: api as ReturnType<typeof useStatusTransition>,
    optimisticUpdate,
    revertOptimisticUpdate,
  };
}

describe("useStatusTransition", () => {
  beforeEach(() => {
    mockTransitionRequest.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
  });

  it("optimistic update happens before the action call", async () => {
    const calls: string[] = [];
    const { api, optimisticUpdate } = harness();
    optimisticUpdate.mockImplementation(() => calls.push("optimistic"));
    mockTransitionRequest.mockImplementation(async () => {
      calls.push("action");
      return { ok: true, updatedAt: "2026-04-26T11:00:00Z" };
    });

    await act(async () => {
      await api.runTransition({
        requestId: "req-1",
        action: "accept",
        toStatus: "accepted",
        optimisticData: { accepted_at: new Date("2026-04-26") },
        successToast: "ok",
      });
    });

    expect(calls).toEqual(["optimistic", "action"]);
    expect(optimisticUpdate).toHaveBeenCalledWith(
      "req-1",
      "accepted",
      expect.objectContaining({ accepted_at: expect.any(Date), status: "accepted" })
    );
  });

  it("forwards action + payload to the server action", async () => {
    const { api } = harness();
    mockTransitionRequest.mockResolvedValue({ ok: true, updatedAt: "..." });

    await act(async () => {
      await api.runTransition({
        requestId: "req-1",
        action: "propose_price",
        toStatus: "price_proposed",
        proposedPrice: 50000,
        successToast: "ok",
      });
    });

    expect(mockTransitionRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "req-1",
        action: "propose_price",
        proposedPrice: 50000,
      })
    );
  });

  it("reverts to the original status when the action returns ok:false", async () => {
    const { api, revertOptimisticUpdate } = harness();
    mockTransitionRequest.mockResolvedValue({
      ok: false,
      error: "Заявка устарела",
      code: "conflict",
    });

    await act(async () => {
      await api.runTransition({
        requestId: "req-1",
        action: "accept",
        toStatus: "accepted",
        successToast: "ok",
      });
    });

    expect(revertOptimisticUpdate).toHaveBeenCalledWith("req-1", "pending");
    expect(mockToastError).toHaveBeenCalledWith("Заявка устарела");
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it("reverts and shows generic error when the action throws", async () => {
    const { api, revertOptimisticUpdate } = harness();
    mockTransitionRequest.mockRejectedValue(new Error("network"));

    await act(async () => {
      await api.runTransition({
        requestId: "req-1",
        action: "accept",
        toStatus: "accepted",
        successToast: "ok",
      });
    });

    expect(revertOptimisticUpdate).toHaveBeenCalledWith("req-1", "pending");
    expect(mockToastError).toHaveBeenCalledWith("Алдаа гарлаа");
  });

  it("calls onSuccess after a successful action", async () => {
    const { api } = harness();
    mockTransitionRequest.mockResolvedValue({ ok: true, updatedAt: "..." });
    const onSuccess = jest.fn();

    await act(async () => {
      await api.runTransition({
        requestId: "req-1",
        action: "accept",
        toStatus: "accepted",
        successToast: "ok",
        onSuccess,
      });
    });

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(mockToastSuccess).toHaveBeenCalledWith("ok");
  });
});
