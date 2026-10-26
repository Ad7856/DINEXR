"use client";
export function ConfirmButton({ message, className, children }: { message: string; className?: string; children: React.ReactNode }) {
  return <button className={className} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>{children}</button>;
}
export function PrintButton() {
  return <button className="btn print:hidden" onClick={() => window.print()}>Print card</button>;
}
