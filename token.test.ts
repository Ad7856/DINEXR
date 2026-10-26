import { describe, expect, it } from "vitest";
import { hashToken, makeTrackingToken, TOKEN_RE } from "./token";

const S = "x".repeat(40);
describe("tracking token", () => {
  it("is deterministic and well-formed", () => {
    const a = makeTrackingToken(S, "r1", "k1");
    expect(a).toBe(makeTrackingToken(S, "r1", "k1"));
    expect(TOKEN_RE.test(a)).toBe(true);
  });
  it("differs by key, restaurant and secret", () => {
    const a = makeTrackingToken(S, "r1", "k1");
    expect(makeTrackingToken(S, "r1", "k2")).not.toBe(a);
    expect(makeTrackingToken(S, "r2", "k1")).not.toBe(a);
    expect(makeTrackingToken("y".repeat(40), "r1", "k1")).not.toBe(a);
  });
  it("hash is not the token", () => {
    const t = makeTrackingToken(S, "r1", "k1");
    expect(hashToken(t)).not.toContain(t);
    expect(hashToken(t)).toHaveLength(64);
  });
});
