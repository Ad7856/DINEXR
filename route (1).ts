import { NextResponse } from "next/server";
import { quoteSchema } from "@/server/orders/schemas";
import { quoteCart } from "@/server/orders/create";
import { OrderError } from "@/server/orders/pricing";
import { clientIp, rateLimit } from "@/server/rate-limit";

export async function POST(req: Request) {
  if (!rateLimit(`quote:${clientIp(req)}`, 60, 60_000).ok)
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  const parsed = quoteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Your cart could not be read. Please refresh." }, { status: 422 });
  try {
    return NextResponse.json(await quoteCart(parsed.data));
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.message }, { status: 422 });
    console.error("quote failed", e);
    return NextResponse.json({ error: "We couldn't price your cart. Please try again." }, { status: 500 });
  }
}
