import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useIdnLive } from "../useIdnLive";

const successPayload = {
  isLive: true,
  liveStream: {
    slug: "test-stream",
    title: "Test Live",
    viewCount: 123,
  },
  profile: {
    username: "jkt48_eli",
    name: "Eli",
    avatar: "https://example.com/a.jpg",
    bio: "test bio",
    followerCount: 42,
  },
};

describe("useIdnLive", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does not fetch when username is empty", () => {
    renderHook(() => useIdnLive(""));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches with the encoded username and exposes live state", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => successPayload,
    });

    const { result } = renderHook(() => useIdnLive("jkt48_eli"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetch).toHaveBeenCalledWith(
      "/api/idn-status?username=jkt48_eli",
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(result.current.isLive).toBe(true);
    expect(result.current.liveStream?.slug).toBe("test-stream");
    expect(result.current.profile?.username).toBe("jkt48_eli");
    expect(result.current.error).toBeNull();
  });

  it("captures the error when the upstream returns non-ok", async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });

    const { result } = renderHook(() => useIdnLive("jkt48_eli"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isLive).toBe(false);
    expect(result.current.error).toMatch(/500/);
  });

  it("does not setState after unmount (cancels in-flight fetch)", async () => {
    let resolveFetch;
    fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = () =>
            resolve({ ok: true, json: async () => successPayload });
        }),
    );

    const { result, unmount } = renderHook(() => useIdnLive("jkt48_eli"));
    expect(result.current.isLoading).toBe(true);

    unmount();
    resolveFetch();

    await Promise.resolve();
    expect(result.current.isLoading).toBe(true);
  });
});
