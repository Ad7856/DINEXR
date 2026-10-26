import { describe, expect, it } from "vitest";
import { OrderError } from "./pricing";
import { priceAndSnapshot, type DishFull } from "./snapshot";

const dish: DishFull = { id: "d1", restaurantId: "r1", name: "Paneer Tikka", price: 24900, isAvailable: true,
  customizations: [{ id: "c1", priceDelta: 2000, group: "Extras", option: "Extra cheese" }] };
const map = new Map([["d1", dish]]);

describe("priceAndSnapshot", () => {
  it("snapshots name, unit price and customization labels", () => {
    const r = priceAndSnapshot([{ dishId: "d1", quantity: 2, customizationIds: ["c1"], instructions: "less spicy" }], map, "r1", 500, 0);
    expect(r.items[0]).toMatchObject({ name: "Paneer Tikka", unit_price: 26900, quantity: 2, instructions: "less spicy" });
    expect(r.items[0].customizations[0]).toMatchObject({ option: "Extra cheese", price_delta: 2000 });
    expect(r.total).toBe(56490);
  });
  it("rejects a dish from another restaurant (isolation)", () => {
    expect(() => priceAndSnapshot([{ dishId: "d1", quantity: 1, customizationIds: [] }], map, "r2", 0, 0)).toThrow(OrderError);
  });
});
