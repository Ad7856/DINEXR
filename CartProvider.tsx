"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartLine = {
  key: string; dishId: string; name: string; unitPrice: number; quantity: number;
  customizationIds: string[]; customizationLabels: string[]; instructions: string;
};
type Ctx = {
  ready: boolean; lines: CartLine[]; count: number;
  add: (l: Omit<CartLine, "key">) => void;
  setQty: (key: string, q: number) => void;
  setInstructions: (key: string, text: string) => void;
  remove: (key: string) => void; clear: () => void;
};
const CartCtx = createContext<Ctx | null>(null);
export const useCart = () => {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
};
const lineKey = (l: Omit<CartLine, "key">) =>
  [l.dishId, [...l.customizationIds].sort().join(","), l.instructions.trim()].join("|");

/** One cart per restaurant (storage key includes the slug), so carts from different restaurants never merge. */
export function CartProvider({ restaurantSlug, children }: { restaurantSlug: string; children: React.ReactNode }) {
  const storageKey = `dinexr-cart:${restaurantSlug}`;
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setLines(JSON.parse(raw));
    } catch { /* corrupt or blocked storage: start empty */ }
    setReady(true);
  }, [storageKey]);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(storageKey, JSON.stringify(lines)); } catch { /* ignore */ }
  }, [lines, ready, storageKey]);

  const add = useCallback((l: Omit<CartLine, "key">) => {
    const key = lineKey(l);
    setLines((cur) => {
      const hit = cur.find((x) => x.key === key);
      if (hit) return cur.map((x) => (x.key === key ? { ...x, quantity: Math.min(50, x.quantity + l.quantity) } : x));
      return [...cur, { ...l, key }];
    });
  }, []);
  const setQty = useCallback((key: string, q: number) =>
    setLines((c) => c.map((x) => (x.key === key ? { ...x, quantity: Math.max(1, Math.min(50, q)) } : x))), []);
  const setInstructions = useCallback((key: string, t: string) =>
    setLines((c) => c.map((x) => (x.key === key ? { ...x, instructions: t.slice(0, 200) } : x))), []);
  const remove = useCallback((key: string) => setLines((c) => c.filter((x) => x.key !== key)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({ ready, lines, count: lines.reduce((n, l) => n + l.quantity, 0), add, setQty, setInstructions, remove, clear }),
    [ready, lines, add, setQty, setInstructions, remove, clear],
  );
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}
