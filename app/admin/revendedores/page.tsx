import { requireRole } from "@/lib/auth/guards";
import { getSolicitudesPendientes } from "@/lib/revendedores/actions";
import { SolicitudesPendientesTable } from "@/components/revendedores/solicitudes-pendientes-table";

export default async function AdminRevendedoresPage() {
  await requireRole(["administrador"]);
  const solicitudes = await getSolicitudesPendientes();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Solicitudes de revendedor</h1>
        <p className="text-sm text-muted-foreground">
          Aprobar cambia el rol del usuario a Revendedor. Rechazar requiere un
          motivo y el usuario sigue operando como cliente final.
        </p>
      </div>
      <SolicitudesPendientesTable solicitudes={solicitudes} />
    </div>
  );
}
