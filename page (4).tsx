import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_ROLES, requireRole } from "@/server/auth/guards";
import { Banner } from "@/features/admin/Banner";
import { DishForm } from "@/features/admin/DishForm";

export const metadata = { title: "New dish" };
export default async function NewDish({ searchParams }: { searchParams: { e?: string } }) {
  const staff = await requireRole(ADMIN_ROLES, "/admin/menu/new");
  const { data } = await createClient().from("categories").select("id,name").eq("restaurant_id", staff.restaurantId).order("sort_order");
  return (<div className="max-w-xl space-y-4"><Link href="/admin/menu" className="text-sm text-chalk-dim underline">← Menu</Link><h1 className="font-chalk text-4xl">New dish</h1>
    <Banner e={searchParams.e} /><DishForm categories={data ?? []} /></div>);
}
