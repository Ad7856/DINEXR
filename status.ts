import { canTransition, type Status } from "./pricing";
import type { MemberRole } from "@/types/db";

/** Transition must be valid AND permitted for the role. Kitchen: accept, prepare, ready. Admin roles: everything valid (incl. served, cancel). */
export function roleMayTransition(role: MemberRole, from: Status, to: Status): boolean {
  if (!canTransition(from, to)) return false;
  if (role === "kitchen") return to === "accepted" || to === "preparing" || to === "ready";
  return true;
}

/** Keep only characters safe to embed in a PostgREST filter (no commas, parens, dots, wildcards). */
export const sanitizeSearch = (q: string | null | undefined) => (q ?? "").replace(/[^a-zA-Z0-9 \-]/g, "").trim().slice(0, 40);
