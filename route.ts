import { NextResponse } from "next/server";
import { orderSchema } from "@/server/orders/schemas";
import { createOrder } from "@/server/orders/create";
import { OrderError } from "@/server/orders/pricing";
import { clientIp, rateLimit } from "@/server/rate-limit";

export async function POST(req: Request) {
  if (!rateLimit(`order:${clientIp(req)}`, 10, 60_000).ok)
    return NextResponse.json({ error: "Too many orders. Please wait a minute and try again." }, { status: 429 });
  const parsed = orderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check your name, phone number and notes." }, { status: 422 });
  try {
    const r = await createOrder(parsed.data);
    return NextResponse.json(r, { status: r.duplicate ? 200 : 201 });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.message }, { status: 422 });
    console.error("order failed", e); // details stay in server logs
    return NextResponse.json({ error: "We couldn't place your order. Please try again." }, { status: 500 });
  }
}
