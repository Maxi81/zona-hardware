import { requireRole } from "@/lib/auth/guards";
import { getCatalogoPublico } from "@/lib/catalogo/actions";
import { getCategorias, getMarcas } from "@/lib/productos/actions";
import { CatalogoFiltros } from "@/components/catalogo/catalogo-filtros";
import { CatalogoGrid } from "@/components/catalogo/catalogo-grid";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

type SearchParams = Promise<{
  categoria_id?: string;
  marca_id?: string;
  precio_min?: string;
  precio_max?: string;
  especificaciones?: string;
  q?: string;
}>;

export default async function CatalogoMayoristaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole(["revendedor"]);
  const params = await searchParams;

  const [productos, categorias, marcas] = await Promise.all([
    getCatalogoPublico("revendedor", {
      categoriaId: params.categoria_id || undefined,
      marcaId: params.marca_id || undefined,
      precioMin: params.precio_min ? Number(params.precio_min) : undefined,
      precioMax: params.precio_max ? Number(params.precio_max) : undefined,
      especificaciones: params.especificaciones || undefined,
      q: params.q || undefined,
    }),
    getCategorias(),
    getMarcas(),
  ]);

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Catálogo mayorista</h1>
          <p className="text-sm text-muted-foreground">
            Precio de revendedor cuando está cargado; si no, precio de
            público · {productos.length} producto{productos.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <CatalogoFiltros
            basePath="/catalogo-mayorista"
            categorias={categorias}
            marcas={marcas}
            categoriaId={params.categoria_id}
            marcaId={params.marca_id}
            precioMin={params.precio_min}
            precioMax={params.precio_max}
            especificaciones={params.especificaciones}
            q={params.q}
          />
          <CatalogoGrid productos={productos} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
