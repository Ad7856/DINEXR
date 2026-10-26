import { notFound } from "next/navigation";
import { lookupTable } from "@/server/restaurants/lookup";
import { CartView } from "@/features/cart/CartView";

export const metadata = { title: "Your order" };

export default async function CartPage({ params }: { params: { restaurantSlug: string; tableSlug: string } }) {
  const ctx = await lookupTable(params.restaurantSlug, params.tableSlug);
  if (!ctx) notFound();
  return <CartView restaurantSlug={ctx.restaurant.slug} tableCode={params.tableSlug} tableLabel={ctx.table.label}
    orderingEnabled={ctx.restaurant.is_ordering_enabled} />;
}
