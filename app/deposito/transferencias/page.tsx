import { requireRole } from "@/lib/auth/guards";
import { getDepositos } from "@/lib/productos/actions";
import { getProductosParaStock } from "@/lib/stock/actions";
import {
  buscarStockEnRed,
  getTransferenciasDelDeposito,
} from "@/lib/transferencias/actions";
import { DepositoSelector } from "@/components/stock/deposito-selector";
import { BuscarTransferenciaForm } from "@/components/transferencias/buscar-transferencia-form";
import { SolicitarTransferenciaForm } from "@/components/transferencias/solicitar-transferencia-form";
import { PendientesAprobarTable } from "@/components/transferencias/pendientes-aprobar-table";
import { DespacharTable } from "@/components/transferencias/despachar-table";
import { RecibirTable } from "@/components/transferencias/recibir-table";
import { HistorialTable } from "@/components/transferencias/historial-table";
import Link from "next/link";

type SearchParams = Promise<{ deposito_id?: string; producto_id?: string }>;

export default async function TransferenciasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole(["encargado_deposito"]);
  const params = await searchParams;
  const depositoId = params.deposito_id;
  const productoId = params.producto_id;

  const [depositos, productos] = await Promise.all([
    getDepositos(),
    getProductosParaStock(),
  ]);

  const productoBuscado = productos.find((p) => p.id === productoId);

  const [resultadosBusqueda, transferencias] = depositoId
    ? await Promise.all([
        productoId ? buscarStockEnRed(productoId, depositoId) : Promise.resolve([]),
        getTransferenciasDelDeposito(depositoId),
      ])
    : [[], []];

  const pendientesParaAprobar = transferencias.filter(
    (t) => t.deposito_origen_id === depositoId && t.estado === "pendiente_aprobacion",
  );
  const aprobadasParaDespachar = transferencias.filter(
    (t) => t.deposito_origen_id === depositoId && t.estado === "aprobada",
  );
  const enTransitoParaRecibir = transferencias.filter(
    (t) => t.deposito_destino_id === depositoId && t.estado === "en_transito",
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Transferencias entre depósitos</h1>
        <p className="text-sm text-muted-foreground">
          Si este depósito se queda sin stock de un producto, buscá qué otro
          depósito de la red lo tiene y solicitale una transferencia. Las
          salidas de este depósito necesitan aprobación antes de despacharse.
        </p>
        {depositoId && (
          <p className="text-sm mt-1">
            <Link href={`/deposito?deposito_id=${depositoId}`} className="underline">
              ← Volver a stock e ingresos de este depósito
            </Link>
          </p>
        )}
      </div>

      <DepositoSelector depositos={depositos} depositoId={depositoId} />

      {depositoId && (
        <>
          <div>
            <h2 className="text-lg font-semibold mb-2">Buscar y solicitar</h2>
            <div className="flex flex-col gap-4">
              <BuscarTransferenciaForm
                depositoId={depositoId}
                productos={productos}
                productoIdSeleccionado={productoId}
              />
              {productoId && productoBuscado && (
                <SolicitarTransferenciaForm
                  productoId={productoId}
                  productoNombre={`${productoBuscado.nombre} (${productoBuscado.sku})`}
                  depositoDestinoId={depositoId}
                  resultados={resultadosBusqueda}
                />
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">
              Pendientes de aprobación desde este depósito
            </h2>
            <PendientesAprobarTable transferencias={pendientesParaAprobar} />
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">
              Aprobadas, listas para despachar
            </h2>
            <DespacharTable transferencias={aprobadasParaDespachar} />
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">En tránsito hacia este depósito</h2>
            <RecibirTable transferencias={enTransitoParaRecibir} />
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Historial de este depósito</h2>
            <HistorialTable transferencias={transferencias} depositoId={depositoId} />
          </div>
        </>
      )}
    </div>
  );
}
