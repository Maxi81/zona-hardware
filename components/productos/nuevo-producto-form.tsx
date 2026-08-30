"use client";

import { crearProducto, type Categoria, type Marca } from "@/lib/productos/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useState } from "react";

export function NuevoProductoForm({
  categorias,
  marcas,
}: {
  categorias: Categoria[];
  marcas: Marca[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const puedeCrear = categorias.length > 0 && marcas.length > 0;

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError(null);
    const result = await crearProducto(formData);
    if (result.error) setError(result.error);
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Nuevo producto</CardTitle>
      </CardHeader>
      <CardContent>
        {!puedeCrear ? (
          <p className="text-sm text-muted-foreground">
            Cargá al menos una categoría y una marca antes de crear productos.
          </p>
        ) : (
          <form action={handleSubmit} className="grid gap-4 max-w-xl">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" name="sku" required placeholder="TAL-001" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" name="nombre" required placeholder="Taladro percutor 750W" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input id="descripcion" name="descripcion" placeholder="Opcional" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="categoria_id">Categoría</Label>
                <Select id="categoria_id" name="categoria_id" required defaultValue="">
                  <option value="" disabled>
                    Elegí una categoría
                  </option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="marca_id">Marca</Label>
                <Select id="marca_id" name="marca_id" required defaultValue="">
                  <option value="" disabled>
                    Elegí una marca
                  </option>
                  {marcas.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="precio_b2c">Precio cliente (B2C)</Label>
                <Input
                  id="precio_b2c"
                  name="precio_b2c"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="15000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="precio_b2b">Precio revendedor (B2B)</Label>
                <Input
                  id="precio_b2b"
                  name="precio_b2b"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Opcional, si no usa el de cliente"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="imagen_url">URL de imagen</Label>
              <Input
                id="imagen_url"
                name="imagen_url"
                type="url"
                placeholder="https://... (opcional)"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={loading} className="w-fit">
              {loading ? "Creando..." : "Crear producto (queda en borrador)"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
