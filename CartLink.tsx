"use client";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "./CartProvider";

export function CartLink({ href }: { href: string }) {
  const { count } = useCart();
  return (
    <Link href={href} aria-label={`Cart, ${count} items`} className="relative rounded-full border border-board-line p-2 hover:border-bloom">
      <ShoppingBag size={20} />
      {count > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-bloom px-1.5 text-xs font-bold text-board">{count}</span>}
    </Link>
  );
}
