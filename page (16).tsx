import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { lookupTable } from "@/server/restaurants/lookup";
import { DishMedia } from "@/features/dish/DishMedia";
import { DishDetail, type Option } from "@/features/dish/DishDetail";

export const dynamic = "force-dynamic";
type Props = { params: { restaurantSlug: string; tableSlug: string; dishId: string } };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function DishPage({ params }: Props) {
  if (!UUID.test(params.dishId)) notFound();
  const ctx = await lookupTable(params.restaurantSlug, params.tableSlug);
  if (!ctx) notFound();
  const { restaurant } = ctx;
  const base = `/r/${restaurant.slug}/t/${params.tableSlug}`;

  const db = createClient(); // public read under RLS
  const { data: dish, error } = await db.from("dishes")
    .select("id,name,description,price,discounted_price,image_url,ingredients,allergens,is_veg,is_available,prep_minutes,model_glb_url,model_usdz_url,model_width_mm,model_depth_mm")
    .eq("id", params.dishId).eq("restaurant_id", restaurant.id).maybeSingle();
  if (error) throw new Error("Dish load failed");
  if (!dish || !dish.is_available) notFound();
  const { data: options, error: oe } = await db.from("dish_customizations")
    .select("id,group_name,option_name,price_delta").eq("dish_id", dish.id).order("group_name");
  if (oe) throw new Error("Options load failed");

  return (
    <main className="space-y-5 p-5">
      <Link href={`${base}/menu`} className="inline-flex items-center gap-1 text-sm text-chalk-dim hover:text-bloom"><ChevronLeft size={16} /> Menu</Link>
      <DishMedia name={dish.name} imageUrl={dish.image_url} glbUrl={dish.model_glb_url} usdzUrl={dish.model_usdz_url}
        sizeCalibrated={dish.model_width_mm != null && dish.model_depth_mm != null} />
      <DishDetail dish={dish} options={(options ?? []) as Option[]} currency={restaurant.currency}
        orderingEnabled={restaurant.is_ordering_enabled} cartHref={`${base}/cart`} />
    </main>
  );
}
