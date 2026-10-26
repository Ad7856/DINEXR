import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaff, STAFF_ROLES } from "@/server/auth/guards";
import { roleMayTransition } from "@/server/orders/status";
import type { Status } from "@/server/orders/pricing";
import { rateLimit } from "@/server/rate-limit";
import { sameOrigin } from "@/server/csrf";

const S = z.enum(["pending", "accepted", "preparing", "ready", "served", "cancelled"]);
const body = z.object({ to: S, expectedFrom: S, reason: z.string().trim().max(300).optional() });
const MSG: Record<string, [string, number]> = {
  not_found: ["Order not found.", 404],
  conflict: ["This order was just updated by someone else. The list has been refreshed.", 409],
  invalid: ["That status change isn’t allowed.", 422],
  reason_required: ["Please give a reason for cancelling.", 422],
};

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const auth = await getStaff(STAFF_ROLES);
  if (!auth.ok) return NextResponse.json({ error: auth.status === 401 ? "Please sign in." : "Not allowed." }, { status: auth.status });
  const { staff } = auth;
  if (!rateLimit(`staff-status:${staff.userId}`, 60, 60_000).ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  if (!z.string().uuid().safeParse(params.id).success) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  const { to, expectedFrom, reason } = parsed.data;
  if (!roleMayTransition(staff.role, expectedFrom as Status, to as Status))
    return NextResponse.json({ error: "Your role can’t make that change." }, { status: 403 });

  // restaurant id comes from the verified membership, never from the request.
  const { data, error } = await createAdminClient().rpc("update_order_status", {
    p_order: params.id, p_restaurant: staff.restaurantId, p_to: to, p_expected: expectedFrom, p_actor: staff.userId, p_reason: reason ?? null,
  });
  if (error) { console.error("status rpc failed", error.message); return NextResponse.json({ error: "Could not update the order." }, { status: 500 }); }
  if (data !== "ok") { const [m, c] = MSG[data as string] ?? ["Could not update the order.", 500]; return NextResponse.json({ error: m }, { status: c }); }
  return NextResponse.json({ ok: true });
}
