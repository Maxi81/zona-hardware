import { Badge } from "@/components/ui/badge";
import type { StockConsolidadoDetalle } from "@/lib/stock/actions";

export function StockConsolidadoTable({ stock }: { stock: StockConsolidadoDetalle[] }) {
  if (stock.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay productos cargados.
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
            <th className="p-3">Total en la red</th>
            <th className="p-3" />
          </tr>
        </thead>
        <tbody>
          {stock.map((s) => (
            <tr key={s.producto_id} className="border-t">
              <td className="p-3 font-mono text-xs">{s.sku}</td>
              <td className="p-3 font-medium">{s.nombre}</td>
              <td className="p-3">{s.cantidad_total}</td>
              <td className="p-3">
                <Badge variant={s.cantidad_total > 0 ? "default" : "secondary"}>
                  {s.cantidad_total > 0 ? "Disponible" : "Sin stock"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
