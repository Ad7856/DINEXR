import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MemberRole } from "@/types/db";
import { ADMIN_ROLES, STAFF_ROLES, pickMembership } from "./roles";

export { ADMIN_ROLES, STAFF_ROLES };
export type Staff = { userId: string; email: string | null; restaurantId: string; role: MemberRole };
export type StaffResult = { ok: true; staff: Staff } | { ok: false; status: 401 | 403 };

/** Non-redirecting check for route handlers and actions. getUser() verifies the JWT with Supabase; membership is read under RLS. */
export async function getStaff(allowed: MemberRole[]): Promise<StaffResult> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, status: 401 };
  const { data: rows, error } = await supabase.from("restaurant_members").select("restaurant_id, role").eq("user_id", auth.user.id);
  if (error) throw new Error("Membership lookup failed");
  const m = pickMembership(rows ?? [], allowed);
  if (!m) return { ok: false, status: 403 };
  return { ok: true, staff: { userId: auth.user.id, email: auth.user.email ?? null, ...m } };
}

/** For pages/layouts: redirects to /login (anonymous) or /forbidden (wrong role). */
export async function requireRole(allowed: MemberRole[], nextPath: string): Promise<Staff> {
  const r = await getStaff(allowed);
  if (!r.ok) redirect(r.status === 401 ? `/login?next=${encodeURIComponent(nextPath)}` : "/forbidden");
  return r.staff;
}

/** Prevents open redirects after login. */
export const safeNext = (n: unknown) => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : "/admin");
