import { describe, expect, it } from "vitest";
import { canTransition, OrderError, priceOrder, type Dish } from "./pricing";

const dish = (o: Partial<Dish> = {}): Dish => ({
  id: "d1", restaurantId: "r1", price: 24900, isAvailable: true,
  customizations: [{ id: "c1", priceDelta: 2000 }], ...o,
});
const m = (d: Dish) => new Map([[d.id, d]]);

describe("priceOrder", () => {
  it("computes totals in minor units", () => {
    const r = priceOrder([{ dishId: "d1", quantity: 2, customizationIds: ["c1"] }], m(dish()), "r1", 500, 0);
    expect(r).toEqual({ subtotal: 53800, tax: 2690, serviceCharge: 0, total: 56490 });
  });
  it("uses discounted price", () => {
    const r = priceOrder([{ dishId: "d1", quantity: 1, customizationIds: [] }], m(dish({ discountedPrice: 20000 })), "r1", 0, 0);
    expect(r.total).toBe(20000);
  });
  it("rejects other restaurant's dish", () => {
    expect(() => priceOrder([{ dishId: "d1", quantity: 1, customizationIds: [] }], m(dish({ restaurantId: "r2" })), "r1", 0, 0)).toThrow(OrderError);
  });
  it("rejects unavailable dish, bad customization, bad quantity", () => {
    const l = (q: number, c: string[]) => [{ dishId: "d1", quantity: q, customizationIds: c }];
    expect(() => priceOrder(l(1, []), m(dish({ isAvailable: false })), "r1", 0, 0)).toThrow();
    expect(() => priceOrder(l(1, ["nope"]), m(dish()), "r1", 0, 0)).toThrow();
    expect(() => priceOrder(l(0, []), m(dish()), "r1", 0, 0)).toThrow();
  });
});

describe("canTransition", () => {
  it("allows forward flow and blocks invalid jumps", () => {
    expect(canTransition("pending", "accepted")).toBe(true);
    expect(canTransition("pending", "ready")).toBe(false);
    expect(canTransition("served", "cancelled")).toBe(false);
  });
});
