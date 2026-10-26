// In-memory fixed-window limiter. Per server instance only: on serverless/multi-instance hosting
// replace with a shared store (e.g. Upstash Redis) before relying on it.
const hits = new Map<string, { n: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  const h = hits.get(key);
  if (!h || now >= h.reset) {
    hits.set(key, { n: 1, reset: now + windowMs });
    if (hits.size > 5000) for (const [k, v] of hits) if (now >= v.reset) hits.delete(k);
    return { ok: true };
  }
  h.n += 1;
  return { ok: h.n <= limit };
}

export const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
