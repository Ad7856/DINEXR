export const formatMoney = (minor: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(minor / 100);

/** "249" or "249.50" rupees -> paise. Returns null for blank, NaN<0, or absurd values. */
export function parseRupees(s: string): number | null {
  const t = s.trim();
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(parseFloat(t) * 100);
}
/** "5" or "2.5" percent -> basis points (0..10000). */
export function parsePercentToBps(s: string): number | null {
  const t = s.trim();
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(t)) return null;
  const bps = Math.round(parseFloat(t) * 100);
  return bps <= 10000 ? bps : null;
}
