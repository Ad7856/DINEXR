import { notFound } from "next/navigation";
import { serverEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { qrDataUrl, tableUrl } from "@/lib/qr";
import { ADMIN_ROLES, requireRole } from "@/server/auth/guards";
import { PrintButton } from "@/features/admin/ui";

export const metadata = { title: "Print QR card" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PrintCard({ params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) notFound();
  const staff = await requireRole(ADMIN_ROLES, `/admin/tables/${params.id}/print`);
  const { data: t } = await createClient().from("restaurant_tables").select("code,label,restaurants(name,slug)").eq("id", params.id).eq("restaurant_id", staff.restaurantId).maybeSingle();
  const r = (t as any)?.restaurants as { name: string; slug: string } | undefined;
  if (!t || !r) notFound();
  const url = tableUrl(serverEnv().NEXT_PUBLIC_SITE_URL, r.slug, t.code);
  const img = await qrDataUrl(url);
  return (
    <div className="space-y-4 print:space-y-0">
      <div className="print:hidden"><PrintButton /></div>
      {/* Print card: white paper, black ink, high-contrast QR. Deliberately not themed so it prints well. */}
      <div style={{ background: "#fff", color: "#111", width: 360, margin: "0 auto", padding: 28, borderRadius: 20, textAlign: "center", border: "2px solid #111", breakInside: "avoid" }}>
        <p style={{ fontSize: 34, fontWeight: 800, letterSpacing: 2, color: "#111" }}>DINEXR</p>
        <p style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>{r.name}</p>
        <img src={img} alt={`QR code for ${t.label}`} width={280} height={280} style={{ margin: "14px auto", display: "block" }} />
        <p style={{ fontSize: 30, fontWeight: 700 }}>{t.label}</p>
        <p style={{ fontSize: 18, marginTop: 6, fontStyle: "italic" }}>Scan. See. Experience. Order.</p>
        <p style={{ fontSize: 11, marginTop: 10, color: "#444", wordBreak: "break-all" }}>{url}</p>
      </div>
    </div>
  );
}
