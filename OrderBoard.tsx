"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, BellOff, Search } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { createClient } from "@/lib/supabase/browser";

type Item = { id: string; name_snapshot: string; quantity: number; customizations: { option: string }[]; instructions: string | null };
type Order = { id: string; order_number: string; status: string; created_at: string; notes: string | null; customer_name: string | null;
  cancel_reason: string | null; customer_phone?: string | null; total?: number; restaurant_tables: { label: string } | null; order_items: Item[] };

const TABS = [["active", "Active"], ["pending", "New"], ["accepted", "Accepted"], ["preparing", "Preparing"], ["ready", "Ready"], ["history", "History"]] as const;
const COLOR: Record<string, string> = { pending: "bg-bloom text-board", accepted: "bg-teal-light text-board", preparing: "bg-wood text-board", ready: "bg-chalk-green text-board", served: "bg-board-line", cancelled: "bg-chalk-pink text-board" };
const NEXT: Record<string, [string, string] | undefined> = { pending: ["accepted", "Accept"], accepted: ["preparing", "Start preparing"], preparing: ["ready", "Mark ready"], ready: ["served", "Mark served"] };
const KITCHEN_MAY = ["accepted", "preparing", "ready"];

export function OrderBoard({ title }: { title: string }) {
  const [tab, setTab] = useState<string>("active");
  const [q, setQ] = useState("");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [role, setRole] = useState<string>("kitchen");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [sound, setSound] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const isAdmin = role !== "kitchen";

  const beep = useCallback(() => {
    const ctx = audio.current; if (!ctx) return;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.frequency.value = 880; g.gain.value = 0.15;
    o.start(); o.stop(ctx.currentTime + 0.25);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/staff/orders?status=${tab}&q=${encodeURIComponent(q)}`, { cache: "no-store" });
      if (res.status === 401) { window.location.href = "/login"; return; }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not load orders.");
      setRole(json.role); setRestaurantId(json.restaurantId); setError(null);
      const list: Order[] = json.orders;
      if (tab === "active" && !q) {
        const ids = new Set(list.filter((o) => o.status === "pending").map((o) => o.id));
        if (seen.current && sound && [...ids].some((id) => !seen.current!.has(id))) beep();
        seen.current = ids;
      }
      setOrders(list);
    } catch (e) { setError(e instanceof TypeError ? "You appear to be offline. Retrying…" : (e as Error).message); }
  }, [tab, q, sound, beep]);

  useEffect(() => { setOrders(null); const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [tab, q]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]); // polling fallback

  // Realtime nudge (RLS-filtered by the staff JWT). If it isn't configured, polling above still works.
  useEffect(() => {
    if (!restaurantId) return;
    const sb = createClient();
    const ch = sb.channel(`orders:${restaurantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` }, () => load())
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [restaurantId, load]);

  const change = async (o: Order, to: string, why?: string) => {
    setBusy(o.id); setNotice(null);
    try {
      const res = await fetch(`/api/staff/orders/${o.id}/status`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, expectedFrom: o.status, reason: why }) });
      const json = await res.json();
      if (!res.ok) setNotice(json.error ?? "Could not update the order.");
      else { setCancelId(null); setReason(""); }
      await load();
    } catch { setNotice("Network problem. Nothing was changed."); } finally { setBusy(null); }
  };
  const toggleSound = () => { if (!sound) audio.current = audio.current ?? new AudioContext(); setSound(!sound); };
  const ago = (iso: string) => { const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000)); return m < 1 ? "just now" : m < 60 ? `${m} min ago` : new Date(iso).toLocaleString("en-IN"); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-chalk text-4xl">{title}</h1>
        <button className="btn-ghost gap-2 !py-2 text-sm" onClick={toggleSound} aria-pressed={sound}>{sound ? <Bell size={16} /> : <BellOff size={16} />} Sound {sound ? "on" : "off"}</button>
      </div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Order status filter">
        {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
          className={`rounded-full border px-4 py-2 text-sm ${tab === k ? "border-bloom bg-bloom text-board" : "border-board-line"}`}>{l}</button>)}
      </div>
      <label className="relative block"><Search size={16} className="absolute left-3 top-3.5 text-chalk-dim" />
        <input className="input !pl-9" placeholder="Search order number or customer name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search orders" /></label>
      {error && <p role="alert" className="card p-3 text-chalk-pink">{error}</p>}
      {notice && <p role="status" className="card p-3 text-chalk-orange">{notice}</p>}

      {orders === null && !error ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading orders">{[0, 1, 2].map((i) => <div key={i} className="h-56 animate-pulse rounded-card bg-board-soft" />)}</div>
      ) : orders && orders.length === 0 ? (
        <p className="card p-8 text-center text-chalk-dim">{q ? "No orders match your search." : "No orders here yet."}</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orders?.map((o) => {
            const next = NEXT[o.status];
            const canNext = next && (isAdmin || KITCHEN_MAY.includes(next[0]));
            const canCancel = isAdmin && ["pending", "accepted", "preparing"].includes(o.status);
            return (
              <li key={o.id} className="card space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div><p className="text-lg font-semibold">{o.order_number}</p>
                    <p className="text-sm text-chalk-dim">{o.restaurant_tables?.label ?? "Table"} · {ago(o.created_at)}</p></div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${COLOR[o.status]}`}>{o.status}</span>
                </div>
                <ul className="space-y-2 text-sm">
                  {o.order_items.map((it) => (
                    <li key={it.id}><span className="font-semibold">{it.quantity} × {it.name_snapshot}</span>
                      {it.customizations?.length > 0 && <span className="block text-chalk-dim">{it.customizations.map((c) => c.option).join(", ")}</span>}
                      {it.instructions && <span className="block text-chalk-orange">“{it.instructions}”</span>}</li>
                  ))}
                </ul>
                {o.notes && <p className="rounded-xl bg-board p-2 text-sm text-chalk-orange">Note: {o.notes}</p>}
                {(o.customer_name || o.customer_phone) && <p className="text-xs text-chalk-dim">{[o.customer_name, o.customer_phone].filter(Boolean).join(" · ")}{o.total != null && ` · ${formatMoney(o.total)}`}</p>}
                {o.status === "cancelled" && o.cancel_reason && <p className="text-sm text-chalk-pink">Cancelled: {o.cancel_reason}</p>}
                {cancelId === o.id ? (
                  <div className="space-y-2">
                    <textarea className="input" rows={2} maxLength={300} placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Cancellation reason" />
                    <div className="flex gap-2"><button className="btn-ghost flex-1 !py-2" onClick={() => setCancelId(null)}>Back</button>
                      <button className="btn flex-1 !bg-chalk-pink !py-2" disabled={!reason.trim() || busy === o.id} onClick={() => change(o, "cancelled", reason)}>Confirm cancel</button></div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {canNext && <button className="btn flex-1 !py-3" disabled={busy === o.id} onClick={() => change(o, next![0])}>{busy === o.id ? "Updating…" : next![1]}</button>}
                    {canCancel && <button className="btn-ghost !py-3" onClick={() => setCancelId(o.id)}>{o.status === "pending" ? "Reject" : "Cancel"}</button>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
