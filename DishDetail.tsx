"use client";
import { useState } from "react";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { useCart } from "@/features/cart/CartProvider";

export type DishData = {
  id: string; name: string; description: string | null; price: number; discounted_price: number | null;
  is_veg: boolean; ingredients: string[]; allergens: string[]; prep_minutes: number | null;
};
export type Option = { id: string; group_name: string; option_name: string; price_delta: number };
type Props = { dish: DishData; options: Option[]; currency: string; orderingEnabled: boolean; cartHref: string };

export function DishDetail({ dish, options, currency, orderingEnabled, cartHref }: Props) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [picked, setPicked] = useState<string[]>([]);
  const [instructions, setInstructions] = useState("");
  const [added, setAdded] = useState(false);

  const chosen = options.filter((o) => picked.includes(o.id));
  const unit = (dish.discounted_price ?? dish.price) + chosen.reduce((s, o) => s + o.price_delta, 0);
  const groups = [...new Set(options.map((o) => o.group_name))];

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const addToCart = () => {
    add({ dishId: dish.id, name: dish.name, unitPrice: unit, quantity: qty, customizationIds: picked,
      customizationLabels: chosen.map((o) => o.option_name), instructions: instructions.trim() });
    setAdded(true);
    setQty(1);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 font-chalk text-4xl text-bloom">
          <span aria-label={dish.is_veg ? "Vegetarian" : "Non-vegetarian"} className={`inline-block h-4 w-4 rounded-sm border-2 ${dish.is_veg ? "border-chalk-green bg-chalk-green" : "border-chalk-pink bg-chalk-pink"}`} />
          {dish.name}
        </h1>
        <p className="mt-1 text-xl font-semibold">
          {formatMoney(dish.discounted_price ?? dish.price, currency)}
          {dish.discounted_price != null && <span className="ml-2 text-sm font-normal text-chalk-dim line-through">{formatMoney(dish.price, currency)}</span>}
        </p>
        {dish.prep_minutes != null && <p className="text-sm text-chalk-dim">About {dish.prep_minutes} min</p>}
      </div>
      {dish.description && <p className="text-chalk-dim">{dish.description}</p>}
      {dish.ingredients.length > 0 && <p className="text-sm"><span className="text-chalk-dim">Ingredients: </span>{dish.ingredients.join(", ")}</p>}
      {dish.allergens.length > 0 && <p className="text-sm text-chalk-orange">Allergens: {dish.allergens.join(", ")}</p>}

      {groups.map((g) => (
        <fieldset key={g} className="card space-y-2 p-4">
          <legend className="px-1 text-sm text-chalk-dim">{g}</legend>
          {options.filter((o) => o.group_name === g).map((o) => (
            <label key={o.id} className="flex min-h-11 items-center justify-between gap-3">
              <span className="flex items-center gap-3">
                <input type="checkbox" className="h-5 w-5 accent-bloom" checked={picked.includes(o.id)} onChange={() => toggle(o.id)} />
                {o.option_name}
              </span>
              {o.price_delta > 0 && <span className="text-sm text-chalk-dim">+{formatMoney(o.price_delta, currency)}</span>}
            </label>
          ))}
        </fieldset>
      ))}

      <label className="block space-y-1">
        <span className="text-sm text-chalk-dim">Special instructions (optional)</span>
        <textarea className="input" rows={2} maxLength={200} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="e.g. less spicy" />
      </label>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3" role="group" aria-label="Quantity">
          <button className="btn-ghost !p-3" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus size={16} /></button>
          <span className="w-6 text-center text-lg" aria-live="polite">{qty}</span>
          <button className="btn-ghost !p-3" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(50, q + 1))}><Plus size={16} /></button>
        </div>
        <button className="btn" disabled={!orderingEnabled} onClick={addToCart}>Add · {formatMoney(unit * qty, currency)}</button>
      </div>
      {!orderingEnabled && <p className="text-sm text-chalk-orange">Ordering is paused at the moment.</p>}
      <p role="status" className="text-sm text-chalk-green">{added && <>Added to cart. <Link href={cartHref} className="underline">View cart</Link></>}</p>
    </div>
  );
}
