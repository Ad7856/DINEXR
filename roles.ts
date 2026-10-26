import type { MemberRole } from "@/types/db";

export const STAFF_ROLES: MemberRole[] = ["platform_admin", "owner", "manager", "kitchen"];
export const ADMIN_ROLES: MemberRole[] = ["platform_admin", "owner", "manager"];

/** Pure role matching (unit-tested). Returns the first membership whose role is allowed, else null. */
export function pickMembership(rows: { restaurant_id: string; role: string }[], allowed: MemberRole[]) {
  const hit = rows.find((r) => (allowed as string[]).includes(r.role));
  return hit ? { restaurantId: hit.restaurant_id, role: hit.role as MemberRole } : null;
}

/** Where to send a user after sign-in. Only same-site absolute paths are honoured (no open redirect). */
export function postLoginPath(next: unknown, rows: { restaurant_id: string; role: string }[]): string {
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) return next;
  if (pickMembership(rows, ADMIN_ROLES)) return "/admin";
  return pickMembership(rows, STAFF_ROLES) ? "/kitchen" : "/forbidden";
}
