"use client";

import { crearCategoria, crearMarca, type Categoria, type Marca } from "@/lib/productos/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export function CategoriasMarcasForm({
  categorias,
  marcas,
}: {
  categorias: Categoria[];
  marcas: Marca[];
}) {
  const [errorCat, setErrorCat] = useState<string | null>(null);
  const [errorMarca, setErrorMarca] = useState<string | null>(null);
  const [loadingCat, setLoadingCat] = useState(false);
  const [loadingMarca, setLoadingMarca] = useState(false);

  const handleCategoria = async (formData: FormData) => {
    setLoadingCat(true);
    setErrorCat(null);
    const result = await crearCategoria(formData);
    if (result.error) setErrorCat(result.error);
    setLoadingCat(false);
  };

  const handleMarca = async (formData: FormData) => {
    setLoadingMarca(true);
    setErrorMarca(null);
    const result = await crearMarca(formData);
    if (result.error) setErrorMarca(result.error);
    setLoadingMarca(false);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Categorías</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {categorias.length === 0
              ? "Todavía no hay categorías cargadas."
              : categorias.map((c) => c.nombre).join(", ")}
          </p>
          <form action={handleCategoria} className="flex gap-2">
            <div className="grid gap-1 flex-1">
              <Label htmlFor="nombre-categoria" className="sr-only">
                Nombre de la categoría
              </Label>
              <Input
                id="nombre-categoria"
                name="nombre"
                required
                placeholder="Ej: Herramientas eléctricas"
              />
            </div>
            <Button type="submit" disabled={loadingCat}>
              {loadingCat ? "..." : "Agregar"}
            </Button>
          </form>
          {errorCat && <p className="text-sm text-red-500">{errorCat}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Marcas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {marcas.length === 0
              ? "Todavía no hay marcas cargadas."
              : marcas.map((m) => m.nombre).join(", ")}
          </p>
          <form action={handleMarca} className="flex gap-2">
            <div className="grid gap-1 flex-1">
              <Label htmlFor="nombre-marca" className="sr-only">
                Nombre de la marca
              </Label>
              <Input id="nombre-marca" name="nombre" required placeholder="Ej: Stanley" />
            </div>
            <Button type="submit" disabled={loadingMarca}>
              {loadingMarca ? "..." : "Agregar"}
            </Button>
          </form>
          {errorMarca && <p className="text-sm text-red-500">{errorMarca}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
