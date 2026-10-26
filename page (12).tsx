import Link from "next/link";
import { lookupTable } from "@/server/restaurants/lookup";
import { notFound } from "next/navigation";

type Props = { params: { restaurantSlug: string; tableSlug: string } };

export default async function TableHome({ params }: Props) {
  const ctx = await lookupTable(params.restaurantSlug, params.tableSlug);
  if (!ctx) notFound();
  const { restaurant } = ctx;
  return (
    <main className="space-y-5 p-5">
      <p className="font-chalk text-3xl text-chalk">Scan. See. Experience. Order.</p>
      {restaurant.description && <p className="text-chalk-dim">{restaurant.description}</p>}
      {!restaurant.is_ordering_enabled && (
        <p role="status" className="card p-4 text-sm text-chalk-orange">Ordering is currently paused. You can still browse the menu.</p>
      )}
      <Link className="btn w-full" href={`/r/${restaurant.slug}/t/${params.tableSlug}/menu`}>View menu</Link>
      <p className="text-sm text-chalk-dim">{[restaurant.address, restaurant.phone].filter(Boolean).join(" · ")}</p>
    </main>
  );
}
