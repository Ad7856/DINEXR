import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { ADMIN_ROLES, requireRole } from "@/server/auth/guards";
import { Banner } from "@/features/admin/Banner";
import { ConfirmButton } from "@/features/admin/ui";
import { createCategory, deleteCategory, renameCategory, setAvailability } from "../actions";

export const metadata = { title: "Menu" };
export const dynamic = "force-dynamic";

export default async function MenuAdmin({ searchParams }: { searchParams: { e?: string; ok?: string } }) {
  const staff = await requireRole(ADMIN_ROLES, "/admin/menu");
  const db = createClient();
  const [cats, dishes] = await Promise.all([
    db.from("categories").select("id,name").eq("restaurant_id", staff.restaurantId).order("sort_order"),
    db.from("dishes").select("id,name,price,discounted_price,is_available,is_veg,category_id").eq("restaurant_id", staff.restaurantId).order("name"),
  ]);
  if (cats.error || dishes.error) throw new Error("Menu load failed");
  const catName = new Map((cats.data ?? []).map((c) => [c.id, c.name]));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between"><h1 className="font-chalk text-4xl">Menu</h1><Link href="/admin/menu/new" className="btn">Add dish</Link></div>
      <Banner e={searchParams.e} ok={searchParams.ok} />

      <section className="space-y-3"><h2 className="text-xl font-semibold">Categories</h2>
        <form action={createCategory} className="flex gap-2"><input className="input" name="name" placeholder="New category" maxLength={40} required aria-label="New category name" /><button className="btn">Add</button></form>
        {(cats.data ?? []).length === 0 && <p className="text-sm text-chalk-dim">No categories yet. Dishes without a category won’t appear in the customer menu sections.</p>}
        <ul className="space-y-2">{(cats.data ?? []).map((c) => (
          <li key={c.id} className="card flex flex-wrap items-center gap-2 p-3">
            <form action={renameCategory} className="flex flex-1 gap-2"><input type="hidden" name="id" value={c.id} /><input className="input !py-2" name="name" defaultValue={c.name} maxLength={40} aria-label={`Rename ${c.name}`} /><button className="btn-ghost !py-2">Rename</button></form>
            <form action={deleteCategory}><input type="hidden" name="id" value={c.id} /><ConfirmButton className="btn-ghost !py-2 text-chalk-pink" message={`Delete “${c.name}”? Its dishes stay but become uncategorized.`}>Delete</ConfirmButton></form>
          </li>))}</ul></section>

      <section className="space-y-3"><h2 className="text-xl font-semibold">Dishes</h2>
        {(dishes.data ?? []).length === 0 ? <p className="card p-6 text-center text-chalk-dim">No dishes yet. Add your first dish.</p> : (
          <ul className="space-y-2">{dishes.data!.map((d) => (
            <li key={d.id} className="card flex flex-wrap items-center justify-between gap-3 p-3">
              <div><p className="font-semibold">{d.name} <span className={`ml-1 text-xs ${d.is_veg ? "text-chalk-green" : "text-chalk-pink"}`}>{d.is_veg ? "VEG" : "NON-VEG"}</span></p>
                <p className="text-sm text-chalk-dim">{catName.get(d.category_id) ?? "Uncategorized"} · {formatMoney(d.discounted_price ?? d.price)}</p></div>
              <div className="flex gap-2">
                <form action={setAvailability}><input type="hidden" name="id" value={d.id} /><input type="hidden" name="available" value={d.is_available ? "0" : "1"} />
                  <button className="btn-ghost !py-2 text-sm" aria-label={`${d.name} is ${d.is_available ? "available" : "unavailable"}. Toggle.`}>{d.is_available ? "Available" : "Unavailable"}</button></form>
                <Link href={`/admin/menu/${d.id}`} className="btn-ghost !py-2 text-sm">Edit</Link>
              </div>
            </li>))}</ul>)}</section>
    </div>
  );
}
