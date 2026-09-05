import { requireRole } from "@/lib/auth/guards";
import { ROLES_INTERNOS_TODOS } from "@/lib/site/roles";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole([...ROLES_INTERNOS_TODOS]);
  const rolCodigo = profile.roles?.[0]?.codigo ?? "administrador";

  return (
    <div className="admin-theme min-h-screen bg-slate-50 text-slate-900 md:flex">
      <AdminSidebar
        nombre={profile.nombre}
        apellido={profile.apellido}
        rolCodigo={rolCodigo}
      />
      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-6xl">{children}</main>
      </div>
    </div>
  );
}
