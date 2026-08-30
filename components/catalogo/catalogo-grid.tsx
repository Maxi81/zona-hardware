import { Cpu, PackageSearch } from "lucide-react";
import type { ProductoCatalogo } from "@/lib/catalogo/actions";

export function CatalogoGrid({ productos }: { productos: ProductoCatalogo[] }) {
  if (productos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
        <PackageSearch className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No hay productos que coincidan con los filtros elegidos.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {productos.map((p) => (
        <article
          key={p.id}
          className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="relative flex h-32 items-center justify-center gradient-accent">
            <Cpu className="h-10 w-10 text-white/90" />
            <span
              className={
                "absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-semibold " +
                (p.disponible
                  ? "bg-white/90 text-emerald-700"
                  : "bg-white/80 text-muted-foreground")
              }
            >
              {p.disponible ? "Disponible" : "Sin stock"}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {[p.categoria, p.marca].filter(Boolean).join(" · ") || "Sin categorizar"}
            </p>
            <h3 className="font-display text-base font-semibold leading-snug">{p.nombre}</h3>
            {p.descripcion && (
              <p className="text-sm text-muted-foreground line-clamp-2">{p.descripcion}</p>
            )}
            {p.especificaciones && (
              <p className="text-xs text-muted-foreground line-clamp-2">{p.especificaciones}</p>
            )}
            <p className="mt-auto pt-2 font-display text-xl font-bold">
              ${p.precio.toLocaleString("es-AR")}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
