import { describe, expect, it } from "vitest";
import { roleMayTransition, sanitizeSearch } from "./status";

describe("roleMayTransition", () => {
  it("kitchen may accept, prepare and mark ready", () => {
    expect(roleMayTransition("kitchen", "pending", "accepted")).toBe(true);
    expect(roleMayTransition("kitchen", "accepted", "preparing")).toBe(true);
    expect(roleMayTransition("kitchen", "preparing", "ready")).toBe(true);
  });
  it("kitchen may not serve or cancel", () => {
    expect(roleMayTransition("kitchen", "ready", "served")).toBe(false);
    expect(roleMayTransition("kitchen", "pending", "cancelled")).toBe(false);
  });
  it("admin roles may serve and cancel but never skip steps or leave final states", () => {
    expect(roleMayTransition("manager", "ready", "served")).toBe(true);
    expect(roleMayTransition("owner", "pending", "cancelled")).toBe(true);
    expect(roleMayTransition("owner", "pending", "ready")).toBe(false);
    expect(roleMayTransition("platform_admin", "served", "pending")).toBe(false);
    expect(roleMayTransition("owner", "cancelled", "accepted")).toBe(false);
  });
});
describe("sanitizeSearch", () => {
  it("strips filter-injection characters", () => {
    expect(sanitizeSearch("DX-0001,status.eq.served)")).toBe("DX-0001statuseqserved");
    expect(sanitizeSearch("  a%b_c  ")).toBe("abc");
    expect(sanitizeSearch(null)).toBe("");
  });
});
