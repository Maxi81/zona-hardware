import type { MovimientoStock } from "@/lib/movimientos/actions";

const TIPO_INFO: Record<
  string,
  { label: string; className: string }
> = {
  INGRESO: { label: "Ingreso (compra)", className: "bg-emerald-50 text-emerald-700" },
  AJUSTE_POSITIVO: { label: "Ajuste (+)", className: "bg-emerald-50 text-emerald-700" },
  AJUSTE_NEGATIVO: { label: "Ajuste (-)", className: "bg-rose-50 text-rose-700" },
  EGRESO_OTRO: { label: "Egreso (otro)", className: "bg-rose-50 text-rose-700" },
  EGRESO_VENTA: { label: "Egreso (venta)", className: "bg-rose-50 text-rose-700" },
  TRANSFERENCIA_ENTRADA: { label: "Transferencia (entrada)", className: "bg-sky-50 text-sky-700" },
  TRANSFERENCIA_SALIDA: { label: "Transferencia (salida)", className: "bg-sky-50 text-sky-700" },
};

function tipoInfo(tipoCodigo: string) {
  return (
    TIPO_INFO[tipoCodigo] ?? {
      label: tipoCodigo,
      className: "bg-slate-100 text-slate-700",
    }
  );
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MovimientosTabla({
  movimientos,
}: {
  movimientos: MovimientoStock[];
}) {
  if (movimientos.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        No hay movimientos que coincidan con los filtros seleccionados.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
            <th className="px-4 py-3 font-medium">Fecha</th>
            <th className="px-4 py-3 font-medium">Depósito</th>
            <th className="px-4 py-3 font-medium">Tipo</th>
            <th className="px-4 py-3 font-medium">Producto</th>
            <th className="px-4 py-3 font-medium text-right">Cantidad</th>
            <th className="px-4 py-3 font-medium">Contraparte / Proveedor</th>
            <th className="px-4 py-3 font-medium">Detalle</th>
            <th className="px-4 py-3 font-medium">Usuario</th>
          </tr>
        </thead>
        <tbody>
          {movimientos.map((mov) => {
            const info = tipoInfo(mov.tipo_codigo);
            const signo = mov.tipo_signo >= 0 ? "+" : "";
            const esTransferencia = mov.referencia_tipo === "transferencia";

            return (
              <tr key={mov.id} className="border-b border-slate-100 last:border-0">
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                  {formatFecha(mov.created_at)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-900">
                  {mov.deposito_nombre}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${info.className}`}
                  >
                    {info.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-900">
                  <div>{mov.producto_nombre}</div>
                  <div className="text-xs text-slate-400">{mov.producto_sku}</div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-medium text-slate-900">
                  {signo}
                  {mov.cantidad}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {esTransferencia && mov.contraparte_deposito_nombre ? (
                    <span>↔ {mov.contraparte_deposito_nombre}</span>
                  ) : mov.proveedor ? (
                    <div>
                      <div>{mov.proveedor}</div>
                      {mov.orden_compra && (
                        <div className="text-xs text-slate-400">
                          OC: {mov.orden_compra}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="max-w-[220px] truncate px-4 py-3 text-slate-500" title={mov.motivo ?? undefined}>
                  {mov.motivo ?? <span className="text-slate-300">—</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                  {mov.usuario_nombre
                    ? `${mov.usuario_nombre} ${mov.usuario_apellido ?? ""}`.trim()
                    : <span className="text-slate-300">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
