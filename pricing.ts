export type Dish = {
  id: string; restaurantId: string; price: number; discountedPrice?: number | null;
  isAvailable: boolean; customizations: { id: string; priceDelta: number }[];
};
export type CartLine = { dishId: string; quantity: number; customizationIds: string[] };

export class OrderError extends Error {}

export function priceOrder(
  lines: CartLine[], dishes: Map<string, Dish>, restaurantId: string,
  taxBps: number, serviceBps: number,
) {
  if (lines.length === 0) throw new OrderError("Cart is empty");
  let subtotal = 0;
  for (const l of lines) {
    const d = dishes.get(l.dishId);
    if (!d || d.restaurantId !== restaurantId) throw new OrderError("Invalid dish");
    if (!d.isAvailable) throw new OrderError("Dish unavailable");
    if (!Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > 50) throw new OrderError("Invalid quantity");
    let unit = d.discountedPrice ?? d.price;
    for (const cid of l.customizationIds) {
      const c = d.customizations.find((x) => x.id === cid);
      if (!c) throw new OrderError("Invalid customization");
      unit += c.priceDelta;
    }
    subtotal += unit * l.quantity;
  }
  const tax = Math.round((subtotal * taxBps) / 10000);
  const serviceCharge = Math.round((subtotal * serviceBps) / 10000);
  return { subtotal, tax, serviceCharge, total: subtotal + tax + serviceCharge };
}

export type Status = "pending" | "accepted" | "preparing" | "ready" | "served" | "cancelled";
const NEXT: Record<Status, Status[]> = {
  pending: ["accepted", "cancelled"], accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"], ready: ["served"], served: [], cancelled: [],
};
export const canTransition = (from: Status, to: Status) => NEXT[from].includes(to);

/** Unit price (base or discounted + chosen customizations). Same rule priceOrder applies per line. */
export function lineUnitPrice(d: Dish, customizationIds: string[]): number {
  return customizationIds.reduce(
    (sum, id) => sum + (d.customizations.find((c) => c.id === id)?.priceDelta ?? 0),
    d.discountedPrice ?? d.price,
  );
}
