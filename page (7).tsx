import { createClient } from "@/lib/supabase/server";
import { ADMIN_ROLES, requireRole } from "@/server/auth/guards";
import { Banner } from "@/features/admin/Banner";
import { updateCharges, updateRestaurant } from "../actions";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: { e?: string; ok?: string } }) {
  const staff = await requireRole(ADMIN_ROLES, "/admin/settings");
  const db = createClient();
  const [{ data: r }, { data: st }] = await Promise.all([
    db.from("restaurants").select("name,slug,description,phone,address,currency,is_ordering_enabled").eq("id", staff.restaurantId).single(),
    db.from("restaurant_settings").select("tax_bps,service_charge_bps").eq("restaurant_id", staff.restaurantId).maybeSingle(),
  ]);
  if (!r) throw new Error("Settings load failed");
  const owner = staff.role === "owner" || staff.role === "platform_admin";
  const L = ({ t, children }: { t: string; children: React.ReactNode }) => <label className="block space-y-1"><span className="text-sm text-chalk-dim">{t}</span>{children}</label>;
  const dis = !owner;
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-chalk text-4xl">Settings</h1>
      <Banner e={searchParams.e} ok={searchParams.ok} />
      {!owner && <p className="card p-3 text-sm text-chalk-orange">Only the restaurant owner can change settings. You can view them here.</p>}
      <form action={updateRestaurant} className="card space-y-4 p-5"><fieldset disabled={dis} className="space-y-4">
        <L t="Restaurant name"><input className="input" name="name" defaultValue={r.name} required maxLength={80} /></L>
        <L t="Description"><textarea className="input" name="description" rows={2} maxLength={400} defaultValue={r.description ?? ""} /></L>
        <L t="Phone"><input className="input" name="phone" defaultValue={r.phone ?? ""} maxLength={30} /></L>
        <L t="Address"><input className="input" name="address" defaultValue={r.address ?? ""} maxLength={200} /></L>
        <label className="flex items-center gap-2"><input type="checkbox" name="is_ordering_enabled" defaultChecked={r.is_ordering_enabled} className="accent-bloom" /> Accept orders</label>
        <p className="text-xs text-chalk-dim">Currency: {r.currency}. Web address (slug): {r.slug}, fixed so printed QR codes keep working.</p>
        <button className="btn w-full">Save</button></fieldset></form>
      <form action={updateCharges} className="card space-y-4 p-5"><fieldset disabled={dis} className="space-y-4"><h2 className="font-semibold">Tax and charges</h2>
        <div className="grid grid-cols-2 gap-3">
          <L t="Tax (%)"><input className="input" name="tax_percent" inputMode="decimal" defaultValue={((st?.tax_bps ?? 0) / 100).toString()} /></L>
          <L t="Service charge (%)"><input className="input" name="service_percent" inputMode="decimal" defaultValue={((st?.service_charge_bps ?? 0) / 100).toString()} /></L></div>
        <button className="btn w-full">Save rates</button></fieldset></form>
    </div>
  );
}
