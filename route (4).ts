import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken, TOKEN_RE } from "@/server/orders/token";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

/** Capability-style access: only the holder of the unguessable token can read this one order. Phone is never returned. */
export async function GET(req: Request, { params }: { params: { token: string } }) {
  if (!rateLimit(`track:${clientIp(req)}`, 120, 60_000).ok)
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  if (!TOKEN_RE.test(params.token)) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  const { data, error } = await createAdminClient()
    .from("orders")
    .select("order_number,status,total,cancel_reason,created_at,restaurants(name,currency),restaurant_tables(label),order_items(name_snapshot,quantity,customizations)")
    .eq("tracking_token_hash", hashToken(params.token))
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load your order." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
