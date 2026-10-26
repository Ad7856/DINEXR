/** Cookie-authenticated POST routes must come from our own origin. Browsers always send Origin on cross-site POSTs. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients; they carry no ambient cookies to abuse
  try { return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host")); } catch { return false; }
}
