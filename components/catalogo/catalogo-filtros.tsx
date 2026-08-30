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
}: {
  basePath: string;
  categorias: Categoria[];
  marcas: Marca[];
  categoriaId?: string;
  marcaId?: string;
  precioMin?: string;
  precioMax?: string;
}) {
  return (
    <form
      action={basePath}
      method="get"
      className="flex flex-wrap items-end gap-4 rounded-md border p-4"
    >
      <div className="grid gap-2">
        <Label htmlFor="categoria_id">Categoría</Label>
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
        <Label htmlFor="marca_id">Marca</Label>
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
        <Label htmlFor="precio_min">Precio mín.</Label>
        <Input
          id="precio_min"
          name="precio_min"
          type="number"
          min="0"
          step="0.01"
          defaultValue={precioMin ?? ""}
          className="w-28"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="precio_max">Precio máx.</Label>
        <Input
          id="precio_max"
          name="precio_max"
          type="number"
          min="0"
          step="0.01"
          defaultValue={precioMax ?? ""}
          className="w-28"
        />
      </div>
      <Button type="submit">Filtrar</Button>
      {(categoriaId || marcaId || precioMin || precioMax) && (
        <a href={basePath} className="text-sm text-muted-foreground underline">
          Limpiar filtros
        </a>
      )}
    </form>
  );
}
