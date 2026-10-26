import { NextResponse } from "next/server";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { qrPngBuffer, tableUrl } from "@/lib/qr";
import { ADMIN_ROLES, getStaff } from "@/server/auth/guards";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const auth = await getStaff(ADMIN_ROLES);
  if (!auth.ok) return NextResponse.json({ error: auth.status === 401 ? "Please sign in." : "Not allowed." }, { status: auth.status });
  if (!z.string().uuid().safeParse(params.id).success) return NextResponse.json({ error: "Not found." }, { status: 404 });
  // Scoped to the staff member's restaurant (plus RLS): other restaurants' tables return 404.
  const { data: t, error } = await createClient().from("restaurant_tables")
    .select("code,restaurants(slug)").eq("id", params.id).eq("restaurant_id", auth.staff.restaurantId).maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load table." }, { status: 500 });
  const slug = (t as any)?.restaurants?.slug as string | undefined;
  if (!t || !slug) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const png = await qrPngBuffer(tableUrl(serverEnv().NEXT_PUBLIC_SITE_URL, slug, t.code));
  return new NextResponse(new Uint8Array(png), { headers: { "Content-Type": "image/png",
    "Content-Disposition": `attachment; filename="dinexr-${t.code}-qr.png"`, "Cache-Control": "private, no-store" } });
}
