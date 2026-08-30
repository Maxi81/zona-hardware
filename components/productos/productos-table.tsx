"use client";

import { cambiarEstadoProducto, type ProductoAdmin } from "@/lib/productos/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const ESTADO_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  borrador: "secondary",
  publicado: "default",
  baja: "destructive",
};

export function ProductosTable({ productos }: { productos: ProductoAdmin[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCambiarEstado = async (
    id: string,
    nuevoEstado: "borrador" | "publicado" | "baja",
  ) => {
    setPendingId(id);
    setError(null);
    const result = await cambiarEstadoProducto(id, nuevoEstado);
    if (result.error) setError(result.error);
    setPendingId(null);
  };

  if (productos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay productos cargados.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">SKU</th>
              <th className="p-3">Nombre</th>
              <th className="p-3">Categoría</th>
              <th className="p-3">Marca</th>
              <th className="p-3">Precio B2C</th>
              <th className="p-3">Precio B2B</th>
              <th className="p-3">Estado</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id} className="border-t align-top">
                <td className="p-3 font-mono text-xs">{p.sku}</td>
                <td className="p-3 font-medium">{p.nombre}</td>
                <td className="p-3 text-muted-foreground">{p.categorias?.nombre ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{p.marcas?.nombre ?? "—"}</td>
                <td className="p-3">${p.precio_b2c}</td>
                <td className="p-3">{p.precio_b2b !== null ? `$${p.precio_b2b}` : "—"}</td>
                <td className="p-3">
                  <Badge variant={ESTADO_VARIANT[p.estado] ?? "secondary"}>{p.estado}</Badge>
                </td>
                <td className="p-3 flex flex-wrap gap-1">
                  {p.estado !== "publicado" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pendingId === p.id}
                      onClick={() => handleCambiarEstado(p.id, "publicado")}
                    >
                      Publicar
                    </Button>
                  )}
                  {p.estado !== "baja" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pendingId === p.id}
                      onClick={() => handleCambiarEstado(p.id, "baja")}
                    >
                      Dar de baja
                    </Button>
                  )}
                  {p.estado === "baja" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pendingId === p.id}
                      onClick={() => handleCambiarEstado(p.id, "borrador")}
                    >
                      Volver a borrador
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
