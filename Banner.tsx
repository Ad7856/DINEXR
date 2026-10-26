export function Banner({ e, ok }: { e?: string; ok?: string }) {
  if (e) return <p role="alert" className="card p-3 text-chalk-pink">{e}</p>;
  if (ok) return <p role="status" className="card p-3 text-chalk-green">{ok}</p>;
  return null;
}
