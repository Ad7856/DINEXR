import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { ADMIN_ROLES, requireRole } from "@/server/auth/guards";
import { Banner } from "@/features/admin/Banner";
import { DishForm } from "@/features/admin/DishForm";
import { ConfirmButton } from "@/features/admin/ui";
import { DishMedia } from "@/features/dish/DishMedia";
import { addOption, deleteDish, deleteOption } from "../../actions";

export const metadata = { title: "Edit dish" };
export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditDish({ params, searchParams }: { params: { dishId: string }; searchParams: { e?: string; ok?: string } }) {
  if (!UUID.test(params.dishId)) notFound();
  const staff = await requireRole(ADMIN_ROLES, `/admin/menu/${params.dishId}`);
  const db = createClient();
  const { data: dish } = await db.from("dishes").select("*").eq("id", params.dishId).eq("restaurant_id", staff.restaurantId).maybeSingle();
  if (!dish) notFound(); // another restaurant's dish is indistinguishable from a missing one
  const [cats, opts] = await Promise.all([
    db.from("categories").select("id,name").eq("restaurant_id", staff.restaurantId).order("sort_order"),
    db.from("dish_customizations").select("id,group_name,option_name,price_delta").eq("dish_id", dish.id).order("group_name"),
  ]);
  return (
    <div className="max-w-xl space-y-5">
      <Link href="/admin/menu" className="text-sm text-chalk-dim underline">← Menu</Link>
      <h1 className="font-chalk text-4xl">{dish.name}</h1>
      <Banner e={searchParams.e} ok={searchParams.ok} />
      <DishForm dish={dish} categories={cats.data ?? []} />
      {dish.model_glb_url && <section className="space-y-2"><h2 className="font-semibold">3D preview</h2>
        <DishMedia name={dish.name} imageUrl={dish.image_url} glbUrl={dish.model_glb_url} usdzUrl={dish.model_usdz_url} sizeCalibrated={dish.model_width_mm != null && dish.model_depth_mm != null} /></section>}
      <section className="space-y-3"><h2 className="font-semibold">Customization options</h2>
        <ul className="space-y-2">{(opts.data ?? []).map((o) => (
          <li key={o.id} className="card flex items-center justify-between p-3 text-sm"><span>{o.group_name}: {o.option_name}{o.price_delta > 0 && ` (+${formatMoney(o.price_delta)})`}</span>
            <form action={deleteOption}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="dish_id" value={dish.id} /><ConfirmButton className="text-chalk-pink underline" message="Remove this option?">Remove</ConfirmButton></form></li>))}</ul>
        <form action={addOption} className="grid grid-cols-2 gap-2"><input type="hidden" name="dish_id" value={dish.id} />
          <input className="input" name="group_name" placeholder="Group (e.g. Extras)" required maxLength={40} /><input className="input" name="option_name" placeholder="Option" required maxLength={60} />
          <input className="input" name="price_delta" placeholder="Extra price ₹ (optional)" inputMode="decimal" /><button className="btn-ghost">Add option</button></form></section>
      <form action={deleteDish}><input type="hidden" name="id" value={dish.id} />
        <ConfirmButton className="text-sm text-chalk-pink underline" message="Delete this dish? Past orders keep their saved name and price.">Delete dish</ConfirmButton></form>
    </div>
  );
}
