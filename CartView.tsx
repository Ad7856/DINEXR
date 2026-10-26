"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { useCart } from "./CartProvider";

type Quote = { currency: string; subtotal: number; tax: number; serviceCharge: number; total: number;
  lines: { name: string; unitPrice: number; lineTotal: number; quantity: number }[] };
type Props = { restaurantSlug: string; tableCode: string; tableLabel: string; orderingEnabled: boolean };

export function CartView({ restaurantSlug, tableCode, tableLabel, orderingEnabled }: Props) {
  const router = useRouter();
  const { ready, lines, setQty, setInstructions, remove, clear } = useCart();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const idem = useRef<{ fp: string; key: string } | null>(null);
  const base = `/r/${restaurantSlug}/t/${tableCode}`;

  const payloadLines = lines.map((l) => ({ dishId: l.dishId, quantity: l.quantity, customizationIds: l.customizationIds,
    instructions: l.instructions || undefined }));
  const fp = JSON.stringify(payloadLines);

  // Server-side price quote: the numbers below come from the server, not from the browser's cached prices.
  useEffect(() => {
    if (!ready || lines.length === 0) { setQuote(null); return; }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/quote", { method: "POST", headers: { "Content-Type": "application/json" }, signal: ctl.signal,
          body: JSON.stringify({ restaurantSlug, tableCode, lines: payloadLines }) });
        const json = await res.json();
        if (!res.ok) { setQuote(null); setQuoteError(json.error ?? "Could not price your cart."); }
        else { setQuote(json); setQuoteError(null); }
      } catch (e) { if ((e as Error).name !== "AbortError") setQuoteError("Network problem. Check your connection and try again."); }
    }, 250);
    return () => { clearTimeout(t); ctl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, fp, restaurantSlug, tableCode]);

  if (!ready) return <div className="p-5"><div className="h-40 animate-pulse rounded-card bg-board-soft" role="status" aria-label="Loading cart" /></div>;
  if (lines.length === 0) {
    return (
      <main className="space-y-3 p-8 text-center">
        <h1 className="font-chalk text-3xl text-bloom">Your cart is empty</h1>
        <p className="text-chalk-dim">Add something tasty from the menu.</p>
        <Link href={`${base}/menu`} className="btn">Browse menu</Link>
      </main>
    );
  }

  const place = async () => {
    setError(null); setSubmitting(true);
    if (!idem.current || idem.current.fp !== fp) idem.current = { fp, key: crypto.randomUUID() }; // same cart => same key => no duplicates
    try {
      const res = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantSlug, tableCode, mode: "dine_in", idempotencyKey: idem.current.key, lines: payloadLines,
          customerName: name.trim() || undefined, customerPhone: phone.trim() || undefined, notes: notes.trim() || undefined }) });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "We couldn't place your order."); setSubmitting(false); return; }
      clear();
      router.push(`/track/${json.token}?placed=1`);
    } catch { setError("Network problem. Your order was not lost: tap Place order again."); setSubmitting(false); }
  };

  const money = (n: number) => formatMoney(n, quote?.currency ?? "INR");
  return (
    <main className="space-y-5 p-5">
      <h1 className="font-chalk text-4xl text-bloom">Your order · {tableLabel}</h1>
      <ul className="space-y-3">
        {lines.map((l) => (
          <li key={l.key} className="card space-y-2 p-4">
            <div className="flex justify-between gap-2">
              <div><p className="font-semibold">{l.name}</p>
                {l.customizationLabels.length > 0 && <p className="text-sm text-chalk-dim">{l.customizationLabels.join(", ")}</p>}</div>
              <button aria-label={`Remove ${l.name}`} onClick={() => remove(l.key)} className="p-2 text-chalk-dim hover:text-chalk-pink"><Trash2 size={18} /></button>
            </div>
            <input className="input !py-2 text-sm" placeholder="Instructions for this item" maxLength={200} value={l.instructions} onChange={(e) => setInstructions(l.key, e.target.value)} aria-label={`Instructions for ${l.name}`} />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button className="btn-ghost !p-2" aria-label="Decrease quantity" onClick={() => setQty(l.key, l.quantity - 1)}><Minus size={14} /></button>
                <span className="w-5 text-center">{l.quantity}</span>
                <button className="btn-ghost !p-2" aria-label="Increase quantity" onClick={() => setQty(l.key, l.quantity + 1)}><Plus size={14} /></button>
              </div>
              <p className="font-semibold">{quote ? money(quote.lines[lines.indexOf(l)]?.lineTotal ?? 0) : "…"}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="card space-y-1 p-4 text-sm" aria-live="polite">
        {quoteError ? <p role="alert" className="text-chalk-pink">{quoteError}</p> : quote ? (
          <>
            <Row k="Subtotal" v={money(quote.subtotal)} />
            {quote.tax > 0 && <Row k="Tax" v={money(quote.tax)} />}
            {quote.serviceCharge > 0 && <Row k="Service charge" v={money(quote.serviceCharge)} />}
            <div className="flex justify-between border-t border-board-line pt-2 text-lg font-semibold"><span>Total</span><span>{money(quote.total)}</span></div>
          </>
        ) : <div className="h-16 animate-pulse rounded-xl bg-board" role="status" aria-label="Calculating total" />}
      </div>

      <div className="space-y-3">
        <input className="input" placeholder="Your name (optional)" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        <input className="input" placeholder="Phone (optional)" inputMode="tel" maxLength={15} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
        <textarea className="input" rows={2} placeholder="Notes for the kitchen (optional)" maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <p className="text-sm text-chalk-dim">Dine-in · pay by cash at the restaurant. Online payment isn’t available.</p>
      {error && <p role="alert" className="text-chalk-pink">{error}</p>}
      {!orderingEnabled && <p className="text-chalk-orange">Ordering is paused at the moment.</p>}
      <button className="btn w-full" disabled={submitting || !quote || !orderingEnabled} onClick={place}>{submitting ? "Placing order…" : "Place order"}</button>
      {confirmClear ? (
        <div className="flex gap-2"><button className="btn-ghost flex-1" onClick={() => { clear(); setConfirmClear(false); }}>Yes, clear cart</button>
          <button className="btn-ghost flex-1" onClick={() => setConfirmClear(false)}>Keep items</button></div>
      ) : <button className="w-full text-sm text-chalk-dim underline" onClick={() => setConfirmClear(true)}>Clear cart</button>}
    </main>
  );
}
const Row = ({ k, v }: { k: string; v: string }) => <div className="flex justify-between"><span className="text-chalk-dim">{k}</span><span>{v}</span></div>;
