import Link from "next/link";
import { requireRole, ADMIN_ROLES } from "@/server/auth/guards";
import { signOut } from "../login/actions";

const NAV = [["/admin", "Overview"], ["/admin/orders", "Orders"], ["/admin/menu", "Menu"], ["/admin/tables", "Tables & QR"], ["/admin/settings", "Settings"]];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireRole(ADMIN_ROLES, "/admin"); // server-side check on every request
  return (
    <div className="min-h-screen md:grid md:grid-cols-[220px_1fr] print:block">
      <aside className="border-b border-board-line bg-board-soft p-4 md:border-b-0 md:border-r print:hidden">
        <p className="font-chalk text-3xl text-bloom">DINEXR</p>
        <nav aria-label="Admin" className="mt-4 flex gap-2 overflow-x-auto md:flex-col">
          {NAV.map(([h, l]) => <Link key={h} className="whitespace-nowrap rounded-xl px-3 py-2 hover:bg-board" href={h}>{l}</Link>)}
        </nav>
        <p className="mt-6 hidden truncate text-xs text-chalk-dim md:block">{staff.email} · {staff.role}</p>
        <form action={signOut}><button className="btn-ghost mt-3 !px-4 !py-2 text-sm">Sign out</button></form>
      </aside>
      <main className="min-w-0 p-6 print:p-0">{children}</main>
    </div>
  );
}
