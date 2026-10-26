"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-chalk text-4xl text-bloom">Something went wrong</h1>
      <p className="text-chalk-dim">We couldn’t load this page. Check your connection and try again.</p>
      <button className="btn" onClick={reset}>Try again</button>
    </main>
  );
}
