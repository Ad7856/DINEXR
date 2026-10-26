import { describe, expect, it } from "vitest";
import { ADMIN_ROLES, STAFF_ROLES, pickMembership } from "./roles";

describe("pickMembership", () => {
  const rows = [{ restaurant_id: "r1", role: "kitchen" }];
  it("kitchen is staff but not admin", () => {
    expect(pickMembership(rows, STAFF_ROLES)).toEqual({ restaurantId: "r1", role: "kitchen" });
    expect(pickMembership(rows, ADMIN_ROLES)).toBeNull();
  });
  it("no membership means no access", () => { expect(pickMembership([], STAFF_ROLES)).toBeNull(); });
  it("returns the restaurant of the matching membership only", () => {
    const r = pickMembership([{ restaurant_id: "r1", role: "kitchen" }, { restaurant_id: "r2", role: "manager" }], ADMIN_ROLES);
    expect(r).toEqual({ restaurantId: "r2", role: "manager" });
  });
  it("ignores unknown roles", () => { expect(pickMembership([{ restaurant_id: "r1", role: "guest" }], STAFF_ROLES)).toBeNull(); });
});

import { postLoginPath } from "./roles";
describe("postLoginPath", () => {
  const kitchen = [{ restaurant_id: "r1", role: "kitchen" }], owner = [{ restaurant_id: "r1", role: "owner" }];
  it("honours same-site paths only", () => {
    expect(postLoginPath("/kitchen", owner)).toBe("/kitchen");
    expect(postLoginPath("//evil.com", owner)).toBe("/admin");
    expect(postLoginPath("https://evil.com", kitchen)).toBe("/kitchen");
  });
  it("routes by role when no next is given", () => {
    expect(postLoginPath("", owner)).toBe("/admin");
    expect(postLoginPath(undefined, kitchen)).toBe("/kitchen");
    expect(postLoginPath("", [])).toBe("/forbidden");
  });
});
