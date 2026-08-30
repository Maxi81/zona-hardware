import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { ProductoLite } from "@/lib/stock/actions";

export function BuscarTransferenciaForm({
  depositoId,
  productos,
  productoIdSeleccionado,
}: {
  depositoId: string;
  productos: ProductoLite[];
  productoIdSeleccionado?: string;
}) {
  if (productos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay productos cargados en Catálogo y precios.
      </p>
    );
  }

  return (
    <form
      action="/deposito/transferencias"
      method="get"
      className="flex flex-wrap items-end gap-4 rounded-md border p-4"
    >
      <input type="hidden" name="deposito_id" value={depositoId} />
      <div className="grid gap-2">
        <Label htmlFor="producto_id">Producto sin stock suficiente acá</Label>
        <Select
          id="producto_id"
          name="producto_id"
          defaultValue={productoIdSeleccionado ?? ""}
          required
        >
          <option value="" disabled>
            Elegí un producto
          </option>
          {productos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} ({p.sku})
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit">Buscar disponibilidad en la red</Button>
    </form>
  );
}
