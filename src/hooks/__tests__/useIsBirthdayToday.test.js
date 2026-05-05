import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useIsBirthdayToday from "../useIsBirthdayToday";

const TARGET = "2026-06-15T00:00:00+07:00";

describe("useIsBirthdayToday", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns false before the window", () => {
    vi.setSystemTime(new Date("2026-06-14T23:59:59+07:00"));
    const { result } = renderHook(() => useIsBirthdayToday(TARGET));
    expect(result.current).toBe(false);
  });

  it("returns true inside the window (midnight WIB)", () => {
    vi.setSystemTime(new Date("2026-06-15T00:00:00+07:00"));
    const { result } = renderHook(() => useIsBirthdayToday(TARGET));
    expect(result.current).toBe(true);
  });

  it("returns true mid-day on birthday", () => {
    vi.setSystemTime(new Date("2026-06-15T15:30:00+07:00"));
    const { result } = renderHook(() => useIsBirthdayToday(TARGET));
    expect(result.current).toBe(true);
  });

  it("returns false right after the 24h window closes", () => {
    vi.setSystemTime(new Date("2026-06-16T00:00:01+07:00"));
    const { result } = renderHook(() => useIsBirthdayToday(TARGET));
    expect(result.current).toBe(false);
  });

  it("returns false for invalid ISO", () => {
    vi.setSystemTime(new Date("2026-06-15T12:00:00+07:00"));
    const { result } = renderHook(() => useIsBirthdayToday("not-a-date"));
    expect(result.current).toBe(false);
  });
});
