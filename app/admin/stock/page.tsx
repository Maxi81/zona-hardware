import { requireRole } from "@/lib/auth/guards";
import { ROLES_INTERNOS_TODOS } from "@/lib/site/roles";
import { getDepositos } from "@/lib/productos/actions";
import {
  getProductosParaStock,
  getStockPorDeposito,
  getStockConsolidadoDetalle,
  getMovimientosRecientes,
} from "@/lib/stock/actions";
import { DepositoSelector } from "@/components/stock/deposito-selector";
import { IngresoForm } from "@/components/stock/ingreso-form";
import { StockDepositoTable } from "@/components/stock/stock-deposito-table";
import { StockConsolidadoTable } from "@/components/stock/stock-consolidado-table";
import { MovimientosRecientesTable } from "@/components/stock/movimientos-recientes-table";
import Link from "next/link";

type SearchParams = Promise<{ deposito_id?: string }>;

export default async function AdminStockPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole([...ROLES_INTERNOS_TODOS]);
  const params = await searchParams;
  const depositoId = params.deposito_id;

  const [depositos, productos, consolidado] = await Promise.all([
    getDepositos(),
    getProductosParaStock(),
    getStockConsolidadoDetalle(),
  ]);

  const [stockDeposito, movimientos] = depositoId
    ? await Promise.all([
        getStockPorDeposito(depositoId),
        getMovimientosRecientes(depositoId),
      ])
    : [[], []];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Depósitos y stock</h1>
        <p className="text-sm text-slate-500">
          Elegí un depósito para ver su stock puntual, registrar ingresos y
          revisar sus últimos movimientos.
        </p>
      </div>

      <DepositoSelector depositos={depositos} depositoId={depositoId} />

      {depositoId && (
        <>
          <p className="text-sm">
            <Link
              href={`/admin/transferencias?deposito_id=${depositoId}`}
              className="text-indigo-600 underline underline-offset-2"
            >
              Transferencias entre depósitos →
            </Link>
          </p>
          <IngresoForm depositoId={depositoId} productos={productos} />
          <div>
            <h2 className="text-lg font-semibold mb-2 text-slate-900">Stock en este depósito</h2>
            <StockDepositoTable stock={stockDeposito} />
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2 text-slate-900">Últimos movimientos</h2>
            <MovimientosRecientesTable movimientos={movimientos} />
          </div>
        </>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-2 text-slate-900">Consolidado de toda la red</h2>
        <StockConsolidadoTable stock={consolidado} />
      </div>
    </div>
  );
}
