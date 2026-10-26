import Link from "next/link";
import { serverEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { tableUrl } from "@/lib/qr";
import { ADMIN_ROLES, requireRole } from "@/server/auth/guards";
import { Banner } from "@/features/admin/Banner";
import { ConfirmButton } from "@/features/admin/ui";
import { createTable, updateTable } from "../actions";

export const metadata = { title: "Tables & QR" };
export const dynamic = "force-dynamic";

export default async function TablesAdmin({ searchParams }: { searchParams: { e?: string; ok?: string } }) {
  const staff = await requireRole(ADMIN_ROLES, "/admin/tables");
  const db = createClient();
  const [{ data: r }, { data: tables, error }] = await Promise.all([
    db.from("restaurants").select("slug").eq("id", staff.restaurantId).single(),
    db.from("restaurant_tables").select("id,code,label,is_active").eq("restaurant_id", staff.restaurantId).order("label"),
  ]);
  if (error || !r) throw new Error("Tables load failed");
  const site = serverEnv().NEXT_PUBLIC_SITE_URL;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-chalk text-4xl">Tables & QR</h1>
      <Banner e={searchParams.e} ok={searchParams.ok} />
      <form action={createTable} className="card grid grid-cols-[1fr_1fr_auto] gap-2 p-3">
        <input className="input" name="label" placeholder="Label (Table 6)" required maxLength={30} aria-label="Table label" />
        <input className="input" name="code" placeholder="code (table-06)" required maxLength={30} aria-label="Table code" /><button className="btn">Add</button></form>
      {(tables ?? []).length === 0 ? <p className="card p-6 text-center text-chalk-dim">No tables yet. Add one to generate its QR code.</p> : (
        <ul className="space-y-3">{tables!.map((t) => {
          const url = tableUrl(site, r.slug, t.code);
          return (
            <li key={t.id} className="card space-y-3 p-4">
              <form action={updateTable} className="grid grid-cols-2 gap-2"><input type="hidden" name="id" value={t.id} />
                <input className="input" name="label" defaultValue={t.label} maxLength={30} aria-label="Label" />
                <input className="input" name="code" defaultValue={t.code} maxLength={30} aria-label="Code" />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={t.is_active} className="accent-bloom" /> Active (accepts scans and orders)</label>
                <ConfirmButton className="btn-ghost !py-2" message="Save changes? Changing the code makes the old printed QR stop working.">Save</ConfirmButton></form>
              <p className="break-all text-xs text-chalk-dim">{url}</p>
              <div className="flex flex-wrap gap-2 text-sm">
                <a className="btn-ghost !py-2" href={`/api/admin/tables/${t.id}/qr`}>Download PNG</a>
                <Link className="btn-ghost !py-2" href={`/admin/tables/${t.id}/print`}>Print card</Link>
                <a className="btn-ghost !py-2" href={url} target="_blank" rel="noreferrer">Preview menu</a></div>
            </li>);})}</ul>)}
      <p className="text-xs text-chalk-dim">QR codes contain only the restaurant and table address, so menu and price changes never require reprinting. Tables with past orders can be deactivated but not deleted.</p>
    </div>
  );
}
