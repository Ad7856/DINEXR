import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { lookupTable } from "@/server/restaurants/lookup";
import type { Category, DishRow } from "@/types/db";

export const metadata = { title: "Menu" };
export const dynamic = "force-dynamic"; // menu/prices change; never serve stale

type Props = { params: { restaurantSlug: string; tableSlug: string } };

export default async function MenuPage({ params }: Props) {
  const ctx = await lookupTable(params.restaurantSlug, params.tableSlug);
  if (!ctx) notFound();
  const { restaurant } = ctx;

  // Public read under RLS (anon key): categories, and available dishes only.
  const db = createClient();
  const [cats, dishes] = await Promise.all([
    db.from("categories").select("id,name,sort_order").eq("restaurant_id", restaurant.id).order("sort_order"),
    db.from("dishes")
      .select("id,category_id,name,description,price,discounted_price,image_url,is_veg,is_available,is_featured,model_glb_url")
      .eq("restaurant_id", restaurant.id).eq("is_available", true).order("name"),
  ]);
  if (cats.error || dishes.error) throw new Error("Menu load failed");

  const categories = (cats.data ?? []) as Category[];
  const items = (dishes.data ?? []) as DishRow[];
  if (items.length === 0) {
    return <main className="p-5"><p className="card p-6 text-center text-chalk-dim">The menu is empty right now. Please check back soon.</p></main>;
  }

  return (
    <main className="space-y-8 p-5">
      {categories.map((c) => {
        const list = items.filter((d) => d.category_id === c.id);
        if (list.length === 0) return null;
        return (
          <section key={c.id} aria-labelledby={`cat-${c.id}`}>
            <h2 id={`cat-${c.id}`} className="mb-3 font-chalk text-3xl text-bloom">{c.name}</h2>
            <ul className="space-y-3">
              {list.map((d) => (
                <li key={d.id}><Link href={`/r/${restaurant.slug}/t/${params.tableSlug}/menu/${d.id}`} className="card flex items-start justify-between gap-3 p-4 hover:border-bloom">
                  <div>
                    <p className="flex items-center gap-2 font-semibold">
                      <span aria-label={d.is_veg ? "Vegetarian" : "Non-vegetarian"}
                        className={`inline-block h-3 w-3 rounded-sm border-2 ${d.is_veg ? "border-chalk-green bg-chalk-green" : "border-chalk-pink bg-chalk-pink"}`} />
                      {d.name}
                    </p>
                    {d.description && <p className="mt-1 text-sm text-chalk-dim">{d.description}</p>}
                    {d.model_glb_url && <span className="mt-2 inline-block rounded-full bg-teal-velvet/40 px-2 py-0.5 text-xs">3D</span>}
                  </div>
                  <p className="shrink-0 font-semibold">{formatMoney(d.discounted_price ?? d.price, restaurant.currency)}</p>
                </Link></li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
