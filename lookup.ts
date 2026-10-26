import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Restaurant, RestaurantTable } from "@/types/db";

const SLUG = /^[a-z0-9-]{3,60}$/;
const CODE = /^[a-z0-9-]{2,30}$/;

export type TableContext = { restaurant: Restaurant; table: RestaurantTable };

/**
 * Validates restaurant + table from URL params on the server.
 * Returns null for anything unknown, malformed, or inactive. Throws only on infrastructure errors.
 * The service-role client is used because restaurant_tables has no public RLS policy.
 */
export const lookupTable = cache(async (restaurantSlug: string, tableSlug: string): Promise<TableContext | null> => {
  if (!SLUG.test(restaurantSlug) || !CODE.test(tableSlug)) return null;
  const db = createAdminClient();

  const { data: restaurant, error: e1 } = await db
    .from("restaurants")
    .select("id,slug,name,description,logo_url,phone,address,currency,is_ordering_enabled,takeaway_enabled")
    .eq("slug", restaurantSlug)
    .maybeSingle();
  if (e1) throw new Error("Restaurant lookup failed");
  if (!restaurant) return null;

  const { data: table, error: e2 } = await db
    .from("restaurant_tables")
    .select("id,code,label,is_active")
    .eq("restaurant_id", restaurant.id)
    .eq("code", tableSlug)
    .maybeSingle();
  if (e2) throw new Error("Table lookup failed");
  if (!table || !table.is_active) return null;

  return { restaurant: restaurant as Restaurant, table: table as RestaurantTable };
});
