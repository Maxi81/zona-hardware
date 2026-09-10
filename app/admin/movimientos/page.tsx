import { requireRole } from "@/lib/auth/guards";
import { ROLES_INTERNOS_TODOS } from "@/lib/site/roles";
import { getDepositos } from "@/lib/productos/actions";
import {
  getProductosParaMovimientos,
  getMovimientosStock,
  type FiltrosMovimientos,
} from "@/lib/movimientos/actions";
import { MovimientosFiltros } from "@/components/movimientos/movimientos-filtros";
import { MovimientosTabla } from "@/components/movimientos/movimientos-tabla";
import { NuevoMovimientoBoton } from "@/components/movimientos/nuevo-movimiento-modal";

type SearchParams = Promise<{
  deposito_id?: string;
  producto_id?: string;
  tipo?: string;
  desde?: string;
  hasta?: string;
}>;

export default async function AdminMovimientosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole([...ROLES_INTERNOS_TODOS]);
  const params = await searchParams;

  const filtros: FiltrosMovimientos = {
    depositoId: params.deposito_id,
    productoId: params.producto_id,
    tipoCodigo: params.tipo,
    desde: params.desde,
    hasta: params.hasta,
  };

  const [depositos, productos, movimientos] = await Promise.all([
    getDepositos(),
    getProductosParaMovimientos(),
    getMovimientosStock(filtros),
  ]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Movimientos de stock</h1>
          <p className="text-sm text-slate-500">
            Historial de ingresos, egresos y transferencias entre depósitos de
            toda la red.
          </p>
        </div>
        <NuevoMovimientoBoton productos={productos} depositos={depositos} />
      </div>

      <MovimientosFiltros productos={productos} depositos={depositos} />

      <MovimientosTabla movimientos={movimientos} />
    </div>
  );
}
