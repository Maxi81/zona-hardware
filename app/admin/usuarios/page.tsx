import { requireRole } from "@/lib/auth/guards";
import { getUsuariosAdmin } from "@/lib/usuarios-admin/actions";
import { UsuariosTable } from "@/components/usuarios-admin/usuarios-table";

export default async function AdminUsuariosPage() {
  await requireRole(["administrador"]);
  const usuarios = await getUsuariosAdmin();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <p className="text-sm text-muted-foreground">
          Desactivar una cuenta le impide iniciar sesión, pero conserva
          intacto su historial de pedidos y movimientos. El motivo queda
          registrado junto con quién y cuándo hizo el cambio.
        </p>
      </div>
      <UsuariosTable usuarios={usuarios} />
    </div>
  );
}
