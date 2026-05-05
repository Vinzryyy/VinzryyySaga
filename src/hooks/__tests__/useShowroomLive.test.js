import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useShowroomLive } from "../useShowroomLive";

describe("useShowroomLive", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does not fetch when roomKey is empty", () => {
    renderHook(() => useShowroomLive(""));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns isLive=true and startedAt when API reports a live stream", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ isLive: true, startedAt: "2026-05-05T10:00:00Z" }),
    });

    const { result } = renderHook(() => useShowroomLive("JKT48_Eli"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetch).toHaveBeenCalledWith(
      "/api/showroom-status?room=JKT48_Eli",
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(result.current.isLive).toBe(true);
    expect(result.current.startedAt).toBe("2026-05-05T10:00:00Z");
    expect(result.current.error).toBeNull();
  });

  it("falls back to safe defaults when API errors out", async () => {
    fetch.mockRejectedValueOnce(new Error("network down"));

    const { result } = renderHook(() => useShowroomLive("JKT48_Eli"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isLive).toBe(false);
    expect(result.current.error).toBe("network down");
  });

  it("URL-encodes special characters in roomKey", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ isLive: false }),
    });

    renderHook(() => useShowroomLive("room with space"));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith(
      "/api/showroom-status?room=room%20with%20space",
      expect.any(Object),
    );
  });
});
