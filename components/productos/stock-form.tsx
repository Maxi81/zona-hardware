"use client";

import { actualizarStock, type Deposito, type ProductoAdmin, type StockAdmin } from "@/lib/productos/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useState } from "react";

export function StockForm({
  productos,
  depositos,
  stock,
}: {
  productos: ProductoAdmin[];
  depositos: Deposito[];
  stock: StockAdmin[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const puedeCargar = productos.length > 0 && depositos.length > 0;

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError(null);
    const result = await actualizarStock(formData);
    if (result.error) setError(result.error);
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Stock por depósito</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!puedeCargar ? (
          <p className="text-sm text-muted-foreground">
            Necesitás al menos un producto y un depósito cargados para asignar stock.
          </p>
        ) : (
          <form action={handleSubmit} className="grid gap-4 max-w-xl md:grid-cols-3 md:items-end">
            <div className="grid gap-2">
              <Label htmlFor="producto_id">Producto</Label>
              <Select id="producto_id" name="producto_id" required defaultValue="">
                <option value="" disabled>
                  Elegí un producto
                </option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="deposito_id">Depósito</Label>
              <Select id="deposito_id" name="deposito_id" required defaultValue="">
                <option value="" disabled>
                  Elegí un depósito
                </option>
                {depositos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cantidad_disponible">Cantidad</Label>
              <Input
                id="cantidad_disponible"
                name="cantidad_disponible"
                type="number"
                min="0"
                step="1"
                required
                placeholder="0"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-fit md:col-span-3">
              {loading ? "Guardando..." : "Guardar stock"}
            </Button>
          </form>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}

        {stock.length > 0 && (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Producto</th>
                  <th className="p-3">Depósito</th>
                  <th className="p-3">Cantidad disponible</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="p-3">
                      {productos.find((p) => p.id === s.producto_id)?.nombre ?? s.producto_id}
                    </td>
                    <td className="p-3 text-muted-foreground">{s.depositos?.nombre ?? "—"}</td>
                    <td className="p-3">{s.cantidad_disponible}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
