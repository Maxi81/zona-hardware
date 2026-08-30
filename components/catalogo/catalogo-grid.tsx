import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProductoCatalogo } from "@/lib/catalogo/actions";

export function CatalogoGrid({ productos }: { productos: ProductoCatalogo[] }) {
  if (productos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay productos que coincidan con los filtros elegidos.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {productos.map((p) => (
        <Card key={p.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base">{p.nombre}</CardTitle>
              <Badge variant={p.disponible ? "default" : "secondary"}>
                {p.disponible ? "Disponible" : "Sin stock"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              {[p.categoria, p.marca].filter(Boolean).join(" · ") || "—"}
            </p>
            {p.descripcion && (
              <p className="text-sm text-muted-foreground line-clamp-2">{p.descripcion}</p>
            )}
            <p className="text-lg font-semibold">
              ${p.precio.toLocaleString("es-AR")}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
