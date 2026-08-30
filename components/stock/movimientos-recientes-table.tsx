import type { MovimientoStock } from "@/lib/stock/actions";

const TIPO_LABEL: Record<string, string> = {
  INGRESO: "Ingreso",
  EGRESO_VENTA: "Egreso por venta",
  TRANSFERENCIA_SALIDA: "Transferencia (salida)",
  TRANSFERENCIA_ENTRADA: "Transferencia (entrada)",
  AJUSTE: "Ajuste",
};

export function MovimientosRecientesTable({
  movimientos,
}: {
  movimientos: MovimientoStock[];
}) {
  if (movimientos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay movimientos registrados en este depósito.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="p-3">Fecha</th>
            <th className="p-3">Producto</th>
            <th className="p-3">Tipo</th>
            <th className="p-3">Cantidad</th>
            <th className="p-3">Motivo</th>
          </tr>
        </thead>
        <tbody>
          {movimientos.map((m) => {
            const codigo = m.tipo_movimiento_stock?.codigo ?? "";
            const signo = m.tipo_movimiento_stock?.signo ?? 1;
            return (
              <tr key={m.id} className="border-t">
                <td className="p-3 text-muted-foreground">
                  {new Date(m.created_at).toLocaleString("es-AR")}
                </td>
                <td className="p-3 font-medium">{m.productos?.nombre ?? "—"}</td>
                <td className="p-3">{TIPO_LABEL[codigo] ?? codigo}</td>
                <td className="p-3">
                  {signo > 0 ? "+" : "-"}
                  {m.cantidad}
                </td>
                <td className="p-3 text-muted-foreground">{m.motivo ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
