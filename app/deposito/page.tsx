import { requireRole } from "@/lib/auth/guards";
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

type SearchParams = Promise<{ deposito_id?: string }>;

export default async function DepositoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole(["encargado_deposito"]);
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
        <h1 className="text-2xl font-bold">Depósitos y stock</h1>
        <p className="text-sm text-muted-foreground">
          Elegí un depósito para ver su stock puntual, registrar ingresos y
          revisar sus últimos movimientos.
        </p>
      </div>

      <DepositoSelector depositos={depositos} depositoId={depositoId} />

      {depositoId && (
        <>
          <IngresoForm depositoId={depositoId} productos={productos} />
          <div>
            <h2 className="text-lg font-semibold mb-2">Stock en este depósito</h2>
            <StockDepositoTable stock={stockDeposito} />
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2">Últimos movimientos</h2>
            <MovimientosRecientesTable movimientos={movimientos} />
          </div>
        </>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-2">Consolidado de toda la red</h2>
        <StockConsolidadoTable stock={consolidado} />
      </div>
    </div>
  );
}
