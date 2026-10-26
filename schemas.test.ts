import { describe, expect, it } from "vitest";
import { orderSchema } from "./schemas";

const id = "11111111-1111-4111-8111-111111111111";
const base = { restaurantSlug: "royal-kitchen", tableCode: "table-01", idempotencyKey: id, mode: "dine_in" as const,
  lines: [{ dishId: id, quantity: 1, customizationIds: [id, id] }] };

describe("orderSchema", () => {
  it("accepts a valid order and dedupes customizations", () => {
    const r = orderSchema.parse(base);
    expect(r.lines[0].customizationIds).toEqual([id]);
  });
  it("rejects bad quantity, empty cart, takeaway, bad phone, bad slug", () => {
    expect(orderSchema.safeParse({ ...base, lines: [{ ...base.lines[0], quantity: 0 }] }).success).toBe(false);
    expect(orderSchema.safeParse({ ...base, lines: [] }).success).toBe(false);
    expect(orderSchema.safeParse({ ...base, mode: "takeaway" }).success).toBe(false);
    expect(orderSchema.safeParse({ ...base, customerPhone: "abc" }).success).toBe(false);
    expect(orderSchema.safeParse({ ...base, restaurantSlug: "../x" }).success).toBe(false);
  });
});
