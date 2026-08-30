import { requireRole } from "@/lib/auth/guards";
import { getCatalogoPublico } from "@/lib/catalogo/actions";
import { getCategorias, getMarcas } from "@/lib/productos/actions";
import { CatalogoFiltros } from "@/components/catalogo/catalogo-filtros";
import { CatalogoGrid } from "@/components/catalogo/catalogo-grid";

type SearchParams = Promise<{
  categoria_id?: string;
  marca_id?: string;
  precio_min?: string;
  precio_max?: string;
}>;

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole(["cliente"]);
  const params = await searchParams;

  const [productos, categorias, marcas] = await Promise.all([
    getCatalogoPublico("cliente", {
      categoriaId: params.categoria_id || undefined,
      marcaId: params.marca_id || undefined,
      precioMin: params.precio_min ? Number(params.precio_min) : undefined,
      precioMax: params.precio_max ? Number(params.precio_max) : undefined,
    }),
    getCategorias(),
    getMarcas(),
  ]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Catálogo</h1>
        <p className="text-sm text-muted-foreground">
          Precios de venta al público.
        </p>
      </div>
      <CatalogoFiltros
        basePath="/catalogo"
        categorias={categorias}
        marcas={marcas}
        categoriaId={params.categoria_id}
        marcaId={params.marca_id}
        precioMin={params.precio_min}
        precioMax={params.precio_max}
      />
      <CatalogoGrid productos={productos} />
    </div>
  );
}
