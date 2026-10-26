import Link from "next/link";
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-chalk text-4xl text-bloom">Page not found</h1>
      <p className="text-chalk-dim">This link doesn’t match a restaurant or table. Please scan the QR code on your table again, or ask a member of staff.</p>
      <Link href="/" className="btn-ghost">Go home</Link>
    </main>
  );
}
