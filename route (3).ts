import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getStaff, STAFF_ROLES } from "@/server/auth/guards";
import { ADMIN_ROLES } from "@/server/auth/roles";
import { sanitizeSearch } from "@/server/orders/status";
import { rateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";
const filter = z.enum(["active", "pending", "accepted", "preparing", "ready", "history"]).default("active");
const ACTIVE = ["pending", "accepted", "preparing", "ready"];

export async function GET(req: Request) {
  const auth = await getStaff(STAFF_ROLES);
  if (!auth.ok) return NextResponse.json({ error: auth.status === 401 ? "Please sign in." : "Not allowed." }, { status: auth.status });
  const { staff } = auth;
  if (!rateLimit(`staff-orders:${staff.userId}`, 60, 60_000).ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const url = new URL(req.url);
  const f = filter.safeParse(url.searchParams.get("status") ?? undefined);
  if (!f.success) return NextResponse.json({ error: "Invalid filter." }, { status: 422 });
  const isAdmin = (ADMIN_ROLES as string[]).includes(staff.role);
  // Kitchen never receives customer phone numbers or money totals.
  const cols = "id,order_number,status,created_at,notes,customer_name,cancel_reason,restaurant_tables(label),order_items(id,name_snapshot,quantity,customizations,instructions)"
    + (isAdmin ? ",customer_phone,total" : "");

  // Scoped to the staff member's restaurant AND protected by RLS (is_member) as a second layer.
  let q = createClient().from("orders").select(cols).eq("restaurant_id", staff.restaurantId).limit(100);
  q = f.data === "active" ? q.in("status", ACTIVE) : f.data === "history" ? q.in("status", ["served", "cancelled"]) : q.eq("status", f.data);
  const s = sanitizeSearch(url.searchParams.get("q"));
  if (s) q = q.or(`order_number.ilike.%${s}%,customer_name.ilike.%${s}%`);
  const { data, error } = await q.order("created_at", { ascending: f.data !== "history" });
  if (error) { console.error("orders list failed", error.message); return NextResponse.json({ error: "Could not load orders." }, { status: 500 }); }
  return NextResponse.json({ role: staff.role, restaurantId: staff.restaurantId, orders: data }, { headers: { "Cache-Control": "no-store" } });
}
