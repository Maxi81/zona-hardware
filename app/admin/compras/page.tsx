import { requireRole } from "@/lib/auth/guards";
import { ROLES_INTERNOS_TODOS } from "@/lib/site/roles";
import { getDepositos } from "@/lib/productos/actions";
import { getProductosParaMovimientos } from "@/lib/movimientos/actions";
import { getProveedores } from "@/lib/proveedores/actions";
import {
  getOrdenesCompra,
  getDeudaProveedores,
  type FiltrosOrdenesCompra,
} from "@/lib/compras/actions";
import { NuevaOrdenCompraBoton } from "@/components/compras/nueva-orden-compra-modal";
import { ComprasFiltros } from "@/components/compras/compras-filtros";
import { OrdenesCompraTabla } from "@/components/compras/ordenes-compra-tabla";
import { PagosProveedoresPanel } from "@/components/compras/pagos-proveedores-panel";

type SearchParams = Promise<{
  estado?: string;
  proveedor_id?: string;
  deposito_id?: string;
  tab?: string;
}>;

export default async function AdminComprasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await requireRole([...ROLES_INTERNOS_TODOS]);
  const params = await searchParams;
  const codigoRol = profile.roles?.[0]?.codigo;
  const esAdministrador = codigoRol === "administrador";
  const puedeCargarRemito = codigoRol === "administrador" || codigoRol === "encargado_deposito";
  const tab = params.tab === "pagos" ? "pagos" : "ordenes";

  const filtros: FiltrosOrdenesCompra = {
    estado: params.estado,
    proveedorId: params.proveedor_id,
    depositoId: params.deposito_id,
  };

  const [depositos, productos, proveedores, ordenes, deudas] = await Promise.all([
    getDepositos(),
    getProductosParaMovimientos(),
    getProveedores(),
    getOrdenesCompra(filtros),
    esAdministrador ? getDeudaProveedores() : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compras y proveedores</h1>
          <p className="text-sm text-slate-500">
            Órdenes de compra a proveedores, recepción de remitos y pagos.
          </p>
        </div>
        {esAdministrador && (
          <NuevaOrdenCompraBoton
            proveedores={proveedores}
            depositos={depositos}
            productos={productos}
          />
        )}
      </div>

      {esAdministrador && (
        <div className="flex gap-2 border-b border-slate-200">
          <a
            href="?tab=ordenes"
            className={`px-3 py-2 text-sm font-medium ${
              tab === "ordenes"
                ? "border-b-2 border-indigo-600 text-indigo-700"
                : "text-slate-500"
            }`}
          >
            Órdenes de compra
          </a>
          <a
            href="?tab=pagos"
            className={`px-3 py-2 text-sm font-medium ${
              tab === "pagos" ? "border-b-2 border-indigo-600 text-indigo-700" : "text-slate-500"
            }`}
          >
            Pagos a proveedores
          </a>
        </div>
      )}

      {tab === "pagos" && esAdministrador ? (
        <PagosProveedoresPanel deudas={deudas} />
      ) : (
        <>
          <ComprasFiltros proveedores={proveedores} depositos={depositos} />
          <OrdenesCompraTabla
            ordenes={ordenes}
            puedeGestionar={esAdministrador}
            puedeCargarRemito={puedeCargarRemito}
          />
        </>
      )}
    </div>
  );
}
