import Link from "next/link";
export default function DishNotFound() {
  return (
    <main className="space-y-3 p-8 text-center">
      <h1 className="font-chalk text-3xl text-bloom">Dish unavailable</h1>
      <p className="text-chalk-dim">This dish isn’t on the menu right now.</p>
      <Link href="./" className="btn-ghost">Back to menu</Link>
    </main>
  );
}
