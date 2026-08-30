import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Categoria, Marca } from "@/lib/productos/actions";

export function CatalogoFiltros({
  basePath,
  categorias,
  marcas,
  categoriaId,
  marcaId,
  precioMin,
  precioMax,
  especificaciones,
  q,
}: {
  basePath: string;
  categorias: Categoria[];
  marcas: Marca[];
  categoriaId?: string;
  marcaId?: string;
  precioMin?: string;
  precioMax?: string;
  especificaciones?: string;
  q?: string;
}) {
  const hayFiltrosActivos = Boolean(
    categoriaId || marcaId || precioMin || precioMax || especificaciones || q,
  );

  return (
    <form
      action={basePath}
      method="get"
      className="flex flex-col gap-6 rounded-xl border border-border bg-card p-5 lg:sticky lg:top-24"
    >
      {q && <input type="hidden" name="q" value={q} />}

      <div className="grid gap-2">
        <Label htmlFor="especificaciones" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Especificaciones
        </Label>
        <Input
          id="especificaciones"
          name="especificaciones"
          placeholder="Ej: GDDR6, 16GB, socket AM5"
          defaultValue={especificaciones ?? ""}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="categoria_id" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Categoría
        </Label>
        <Select id="categoria_id" name="categoria_id" defaultValue={categoriaId ?? ""}>
          <option value="">Todas</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="marca_id" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Marca
        </Label>
        <Select id="marca_id" name="marca_id" defaultValue={marcaId ?? ""}>
          <option value="">Todas</option>
          {marcas.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Rango de precio
        </span>
        <div className="flex items-center gap-2">
          <Input
            aria-label="Precio mínimo"
            name="precio_min"
            type="number"
            min="0"
            step="0.01"
            placeholder="Mín."
            defaultValue={precioMin ?? ""}
          />
          <span className="text-muted-foreground">–</span>
          <Input
            aria-label="Precio máximo"
            name="precio_max"
            type="number"
            min="0"
            step="0.01"
            placeholder="Máx."
            defaultValue={precioMax ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <Button type="submit" className="gradient-accent text-white hover:opacity-90">
          Aplicar filtros
        </Button>
        {hayFiltrosActivos && (
          <a
            href={basePath}
            className="text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Limpiar filtros
          </a>
        )}
      </div>
    </form>
  );
}
