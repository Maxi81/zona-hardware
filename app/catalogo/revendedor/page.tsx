import { requireRole } from "@/lib/auth/guards";
import { getMiSolicitudRevendedor } from "@/lib/revendedores/actions";
import { SolicitudRevendedorPanel } from "@/components/revendedores/solicitud-revendedor-panel";

export default async function RevendedorPage() {
  await requireRole(["cliente"]);
  const solicitud = await getMiSolicitudRevendedor();

  return (
    <div className="flex flex-col gap-6 p-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold">Cuenta mayorista</h1>
        <p className="text-sm text-muted-foreground">
          Si comprás para reventa, pedí el alta como revendedor cargando tu
          CUIT. Un administrador va a revisar la solicitud.
        </p>
      </div>
      <SolicitudRevendedorPanel solicitud={solicitud} />
    </div>
  );
}
