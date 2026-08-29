import { requireRole } from "@/lib/auth/guards";
import { getSucursales } from "@/lib/sucursales/actions";
import { NuevaSucursalForm } from "@/components/sucursales/nueva-sucursal-form";
import { SucursalesTable } from "@/components/sucursales/sucursales-table";

export default async function SucursalesPage() {
  await requireRole(["administrador"]);
  const sucursales = await getSucursales();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Sucursales y depósitos</h1>
        <p className="text-sm text-muted-foreground">
          Cada sucursal tiene un único depósito asociado. Desde acá se dan de
          alta las sucursales que después van a poder transferirse stock
          entre sí.
        </p>
      </div>
      <NuevaSucursalForm />
      <SucursalesTable sucursales={sucursales} />
    </div>
  );
}
