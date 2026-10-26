import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { startOfTodayIST } from "@/lib/time";
import { requireRole, ADMIN_ROLES } from "@/server/auth/guards";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const staff = await requireRole(ADMIN_ROLES, "/admin");
  const db = createClient(); const since = startOfTodayIST().toISOString();
  const [orders, items, recent] = await Promise.all([
    db.from("orders").select("status,total").eq("restaurant_id", staff.restaurantId).gte("created_at", since),
    db.from("order_items").select("name_snapshot,quantity,orders!inner(restaurant_id,status,created_at)")
      .eq("orders.restaurant_id", staff.restaurantId).gte("orders.created_at", since).neq("orders.status", "cancelled"),
    db.from("orders").select("id,order_number,status,total,created_at").eq("restaurant_id", staff.restaurantId).order("created_at", { ascending: false }).limit(5),
  ]);
  if (orders.error || items.error || recent.error) throw new Error("Overview load failed");

  const o = orders.data ?? [];
  const by = (s: string) => o.filter((x) => x.status === s).length;
  const revenue = o.filter((x) => x.status !== "cancelled").reduce((n, x) => n + x.total, 0);
  const pop = new Map<string, number>();
  for (const i of items.data ?? []) pop.set(i.name_snapshot, (pop.get(i.name_snapshot) ?? 0) + i.quantity);
  const top = [...pop].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const stats: [string, string][] = [["Orders today", String(o.length)], ["Revenue today", formatMoney(revenue)], ["Pending", String(by("pending"))], ["Completed", String(by("served"))]];

  return (
    <div className="space-y-6">
      <h1 className="font-chalk text-4xl">Overview</h1>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{stats.map(([k, v]) => <div key={k} className="card p-4"><p className="text-sm text-chalk-dim">{k}</p><p className="text-2xl font-semibold">{v}</p></div>)}</div>
      <p className="text-xs text-chalk-dim">“Today” starts at midnight IST. Revenue excludes cancelled orders. Cash is collected at the restaurant.</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4"><h2 className="mb-2 font-semibold">Popular dishes today</h2>
          {top.length === 0 ? <p className="text-sm text-chalk-dim">No orders yet today.</p> : <ol className="space-y-1 text-sm">{top.map(([n, q]) => <li key={n} className="flex justify-between"><span>{n}</span><span className="text-chalk-dim">{q}</span></li>)}</ol>}</section>
        <section className="card p-4"><h2 className="mb-2 font-semibold">Recent orders</h2>
          {(recent.data ?? []).length === 0 ? <p className="text-sm text-chalk-dim">No orders yet.</p> : <ul className="space-y-1 text-sm">{recent.data!.map((r) => <li key={r.id} className="flex justify-between"><span>{r.order_number} · <span className="capitalize text-chalk-dim">{r.status}</span></span><span>{formatMoney(r.total)}</span></li>)}</ul>}
          <Link href="/admin/orders" className="mt-3 inline-block text-sm text-bloom underline">Manage orders</Link></section>
      </div>
    </div>
  );
}
