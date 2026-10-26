"use client";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { formatMoney } from "@/lib/money";

type Order = { order_number: string; status: string; total: number; cancel_reason: string | null;
  restaurants: { name: string; currency: string } | null; restaurant_tables: { label: string } | null;
  order_items: { name_snapshot: string; quantity: number; customizations: { option: string }[] }[] };

const STEPS = ["pending", "accepted", "preparing", "ready", "served"] as const;
const LABEL: Record<string, string> = { pending: "Order received", accepted: "Accepted", preparing: "Preparing", ready: "Ready", served: "Served", cancelled: "Cancelled" };

export function TrackView({ token, justPlaced }: { token: string; justPlaced: boolean }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  // Polling fallback (every 5s) until the order reaches a final state. Realtime comes with Phase 4 staff tooling.
  useEffect(() => {
    let stop = false; let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const res = await fetch(`/api/track/${token}`, { cache: "no-store" });
        if (stop) return;
        if (res.status === 404) { setError("We couldn’t find this order. Check the link you were given."); return; }
        if (!res.ok) throw new Error();
        const data: Order = await res.json();
        setOrder(data); setOffline(false);
        if (data.status === "served" || data.status === "cancelled") return;
      } catch { setOffline(true); }
      timer = setTimeout(load, 5000);
    };
    load();
    return () => { stop = true; clearTimeout(timer); };
  }, [token]);

  if (error) return <main className="mx-auto max-w-md space-y-2 p-8 text-center"><h1 className="font-chalk text-3xl text-bloom">Order not found</h1><p className="text-chalk-dim">{error}</p></main>;
  if (!order) return <main className="mx-auto max-w-md p-6"><div className="h-48 animate-pulse rounded-card bg-board-soft" role="status" aria-label="Loading order" /></main>;

  const idx = STEPS.indexOf(order.status as (typeof STEPS)[number]);
  const cur = order.restaurants?.currency ?? "INR";
  return (
    <main className="mx-auto max-w-md space-y-5 p-5">
      <p className="font-chalk text-3xl text-bloom">DINEXR</p>
      {justPlaced && <p role="status" className="card flex items-center gap-2 p-3 text-chalk-green"><CheckCircle2 size={18} /> Order placed. Save this page to follow your order.</p>}
      <div><h1 className="text-2xl font-semibold">{order.order_number}</h1>
        <p className="text-chalk-dim">{order.restaurants?.name} · {order.restaurant_tables?.label}</p></div>

      {order.status === "cancelled" ? (
        <div role="status" className="card p-4"><p className="font-semibold text-chalk-pink">Order cancelled</p>
          {order.cancel_reason && <p className="text-sm text-chalk-dim">{order.cancel_reason}</p>}</div>
      ) : (
        <ol className="card space-y-3 p-4" aria-label="Order progress">
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === idx ? "step" : undefined} className={`flex items-center gap-3 ${i <= idx ? "text-chalk" : "text-chalk-dim/60"}`}>
              <span className={`h-3 w-3 rounded-full ${i < idx ? "bg-teal-light" : i === idx ? "bg-bloom" : "bg-board-line"}`} />{LABEL[s]}
            </li>
          ))}
        </ol>
      )}
      {offline && <p role="status" className="text-sm text-chalk-orange">Connection problem. Retrying…</p>}

      <ul className="card divide-y divide-board-line">
        {order.order_items.map((it, i) => (
          <li key={i} className="p-3 text-sm"><span className="font-semibold">{it.quantity} × {it.name_snapshot}</span>
            {it.customizations?.length > 0 && <span className="block text-chalk-dim">{it.customizations.map((c) => c.option).join(", ")}</span>}</li>
        ))}
      </ul>
      <p className="flex justify-between text-lg font-semibold"><span>Total (pay at restaurant)</span><span>{formatMoney(order.total, cur)}</span></p>
    </main>
  );
}
