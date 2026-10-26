import { notFound } from "next/navigation";
import { lookupTable } from "@/server/restaurants/lookup";
import { CartProvider } from "@/features/cart/CartProvider";
import { CartLink } from "@/features/cart/CartLink";

type Props = { children: React.ReactNode; params: { restaurantSlug: string; tableSlug: string } };

export default async function TableLayout({ children, params }: Props) {
  const ctx = await lookupTable(params.restaurantSlug, params.tableSlug);
  if (!ctx) notFound();
  const { restaurant, table } = ctx;
  return (
    <CartProvider restaurantSlug={restaurant.slug}>
    <div className="mx-auto min-h-screen max-w-md">
      <header className="flex items-center justify-between border-b border-board-line px-5 py-4">
        <div>
          <p className="font-chalk text-3xl leading-none text-bloom">{restaurant.name}</p>
          <p className="text-xs text-chalk-dim">Powered by DINEXR</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-teal-velvet px-3 py-1 text-sm">{table.label}</span>
          <CartLink href={`/r/${restaurant.slug}/t/${table.code}/cart`} />
        </div>
      </header>
      {children}
    </div>
    </CartProvider>
  );
}
