import Link from "next/link";
export default function Forbidden() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-chalk text-4xl text-bloom">No access</h1>
      <p className="text-chalk-dim">Your account isn’t authorized for this area. Ask the restaurant owner to add you.</p>
      <Link href="/login" className="btn-ghost">Switch account</Link>
    </main>
  );
}
