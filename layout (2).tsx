import { requireRole, STAFF_ROLES } from "@/server/auth/guards";
import { signOut } from "../login/actions";

export default async function KitchenLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireRole(STAFF_ROLES, "/kitchen");
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-board-line bg-board-soft px-6 py-3">
        <p className="font-chalk text-3xl text-bloom">DINEXR Kitchen</p>
        <form action={signOut}><span className="mr-3 text-xs text-chalk-dim">{staff.email}</span><button className="btn-ghost !px-4 !py-2 text-sm">Sign out</button></form>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
