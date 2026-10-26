import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { lookupTable } from "@/server/restaurants/lookup";
import { OrderError } from "./pricing";
import { priceAndSnapshot, type DishFull } from "./snapshot";
import { hashToken, makeTrackingToken } from "./token";
import type { OrderInput, QuoteInput } from "./schemas";

async function priceFromDb(input: QuoteInput) {
  const ctx = await lookupTable(input.restaurantSlug, input.tableCode);
  if (!ctx) throw new OrderError("This table is not available. Please scan the QR code again.");
  const { restaurant, table } = ctx;
  const db = createAdminClient();

  const ids = [...new Set(input.lines.map((l) => l.dishId))];
  const { data, error } = await db
    .from("dishes")
    .select("id,restaurant_id,name,price,discounted_price,is_available,dish_customizations(id,group_name,option_name,price_delta)")
    .eq("restaurant_id", restaurant.id)
    .in("id", ids);
  if (error) throw new Error("Dish load failed");

  const dishes = new Map<string, DishFull>(
    (data ?? []).map((d: any) => [d.id, {
      id: d.id, restaurantId: d.restaurant_id, name: d.name, price: d.price,
      discountedPrice: d.discounted_price, isAvailable: d.is_available,
      customizations: (d.dish_customizations ?? []).map((c: any) => ({
        id: c.id, priceDelta: c.price_delta, group: c.group_name, option: c.option_name,
      })),
    }]),
  );
  const { data: s, error: se } = await db
    .from("restaurant_settings").select("tax_bps,service_charge_bps").eq("restaurant_id", restaurant.id).maybeSingle();
  if (se) throw new Error("Settings load failed");

  const priced = priceAndSnapshot(input.lines, dishes, restaurant.id, s?.tax_bps ?? 0, s?.service_charge_bps ?? 0);
  return { restaurant, table, db, priced, dishes };
}

export async function quoteCart(input: QuoteInput) {
  const { restaurant, priced, dishes } = await priceFromDb(input);
  return {
    currency: restaurant.currency,
    orderingEnabled: restaurant.is_ordering_enabled,
    subtotal: priced.subtotal, tax: priced.tax, serviceCharge: priced.serviceCharge, total: priced.total,
    lines: priced.items.map((it, i) => ({
      dishId: it.dish_id, name: it.name, quantity: it.quantity, unitPrice: it.unit_price,
      lineTotal: it.unit_price * it.quantity,
      customizationLabels: it.customizations.map((c) => c.option),
      available: dishes.get(it.dish_id)?.isAvailable ?? false, index: i,
    })),
  };
}

export async function createOrder(input: OrderInput) {
  const { restaurant, table, db, priced } = await priceFromDb(input);
  if (!restaurant.is_ordering_enabled) throw new OrderError("Ordering is currently paused at this restaurant.");

  const token = makeTrackingToken(serverEnv().ORDER_TOKEN_SECRET, restaurant.id, input.idempotencyKey);
  const { data, error } = await db.rpc("create_order", {
    p: {
      restaurant_id: restaurant.id, table_id: table.id, mode: "dine_in",
      customer_name: input.customerName ?? null, customer_phone: input.customerPhone ?? null, notes: input.notes ?? null,
      subtotal: priced.subtotal, tax: priced.tax, service_charge: priced.serviceCharge, total: priced.total,
      idempotency_key: input.idempotencyKey, tracking_token_hash: hashToken(token), items: priced.items,
    },
  });
  if (error || !data?.[0]) throw new Error("Order insert failed");
  return { orderNumber: data[0].out_order_number as string, token, duplicate: data[0].out_duplicate as boolean };
}
