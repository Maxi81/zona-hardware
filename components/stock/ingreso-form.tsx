"use client";

import { registrarIngreso, type ProductoLite } from "@/lib/stock/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useState } from "react";

export function IngresoForm({
  depositoId,
  productos,
}: {
  depositoId: string;
  productos: ProductoLite[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    const result = await registrarIngreso(formData);
    if (result.error) setError(result.error);
    else setSuccess(true);
    setLoading(false);
  };

  if (productos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay productos cargados en Catálogo y precios.
      </p>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Registrar ingreso de mercadería</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="grid gap-4 max-w-xl md:grid-cols-3 md:items-end">
          <input type="hidden" name="deposito_id" value={depositoId} />
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="producto_id">Producto</Label>
            <Select id="producto_id" name="producto_id" required defaultValue="">
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
          <div className="grid gap-2">
            <Label htmlFor="cantidad">Cantidad</Label>
            <Input id="cantidad" name="cantidad" type="number" min="1" step="1" required />
          </div>
          <div className="grid gap-2 md:col-span-3">
            <Label htmlFor="motivo">Motivo / referencia (opcional)</Label>
            <Input id="motivo" name="motivo" placeholder="Ej: compra a proveedor OC-1023" />
          </div>
          {error && <p className="text-sm text-red-500 md:col-span-3">{error}</p>}
          {success && (
            <p className="text-sm text-muted-foreground md:col-span-3">
              Ingreso registrado correctamente.
            </p>
          )}
          <Button type="submit" disabled={loading} className="w-fit">
            {loading ? "Registrando..." : "Registrar ingreso"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
