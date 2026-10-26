import { lineUnitPrice, priceOrder, type CartLine, type Dish } from "./pricing";

export type DishFull = Omit<Dish, "customizations"> & {
  name: string;
  customizations: { id: string; priceDelta: number; group: string; option: string }[];
};
export type PricedLine = CartLine & { instructions?: string };

/** Validates via priceOrder (throws OrderError), then builds immutable snapshots for order_items. */
export function priceAndSnapshot(
  lines: PricedLine[], dishes: Map<string, DishFull>, restaurantId: string, taxBps: number, serviceBps: number,
) {
  const totals = priceOrder(lines, dishes, restaurantId, taxBps, serviceBps);
  const items = lines.map((l) => {
    const d = dishes.get(l.dishId)!;
    return {
      dish_id: d.id,
      name: d.name,
      unit_price: lineUnitPrice(d, l.customizationIds),
      quantity: l.quantity,
      customizations: l.customizationIds.map((id) => {
        const c = d.customizations.find((x) => x.id === id)!;
        return { id, group: c.group, option: c.option, price_delta: c.priceDelta };
      }),
      instructions: l.instructions ?? null,
    };
  });
  return { ...totals, items };
}
