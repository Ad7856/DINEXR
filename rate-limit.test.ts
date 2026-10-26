import { describe, expect, it } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("blocks after the limit and resets after the window", () => {
    const k = "t1";
    expect(rateLimit(k, 2, 1000, 0).ok).toBe(true);
    expect(rateLimit(k, 2, 1000, 1).ok).toBe(true);
    expect(rateLimit(k, 2, 1000, 2).ok).toBe(false);
    expect(rateLimit(k, 2, 1000, 1001).ok).toBe(true);
  });
});
