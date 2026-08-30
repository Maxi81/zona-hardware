import type { StockDeposito } from "@/lib/stock/actions";

export function StockDepositoTable({ stock }: { stock: StockDeposito[] }) {
  if (stock.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay stock cargado en este depósito.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="p-3">SKU</th>
            <th className="p-3">Producto</th>
            <th className="p-3">Disponible</th>
            <th className="p-3">Reservado</th>
            <th className="p-3">Punto de reposición</th>
          </tr>
        </thead>
        <tbody>
          {stock.map((s) => (
            <tr key={s.id} className="border-t">
              <td className="p-3 font-mono text-xs">{s.productos?.sku ?? "—"}</td>
              <td className="p-3 font-medium">{s.productos?.nombre ?? "—"}</td>
              <td className="p-3">{s.cantidad_disponible}</td>
              <td className="p-3 text-muted-foreground">{s.cantidad_reservada}</td>
              <td className="p-3 text-muted-foreground">{s.punto_reposicion ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
