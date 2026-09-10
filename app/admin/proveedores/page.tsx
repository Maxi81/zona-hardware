import { requireRole } from "@/lib/auth/guards";
import { ROLES_INTERNOS_TODOS } from "@/lib/site/roles";
import { getProveedores } from "@/lib/proveedores/actions";
import { NuevoProveedorForm } from "@/components/proveedores/nuevo-proveedor-form";
import { ProveedoresTable } from "@/components/proveedores/proveedores-table";

export default async function ProveedoresPage() {
  const profile = await requireRole([...ROLES_INTERNOS_TODOS]);
  const esAdministrador = profile.roles?.[0]?.codigo === "administrador";
  const proveedores = await getProveedores();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Proveedores</h1>
        <p className="text-sm text-slate-500">
          Alta y estado de los proveedores que se usan en las órdenes de compra.
        </p>
      </div>
      {esAdministrador && <NuevoProveedorForm />}
      <ProveedoresTable proveedores={proveedores} />
    </div>
  );
}
