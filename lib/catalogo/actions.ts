"use server";

import { createClient } from "@/lib/supabase/server";

export type FiltrosCatalogo = {
  categoriaId?: string;
  marcaId?: string;
  precioMin?: number;
  precioMax?: number;
};

export type ProductoCatalogo = {
  id: string;
  sku: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  categoria: string | null;
  marca: string | null;
  disponible: boolean;
};

// Catalogo publico (HU-011). `rolPrecio` decide que precio mostrar: el
// revendedor ve precio_b2b cuando esta cargado, si no cae a precio_b2c
// (igual que el cliente). El estado de stock viene de stock_consolidado(),
// una funcion SECURITY DEFINER: ni cliente ni revendedor tienen acceso
// directo a la tabla stock (info interna de administrador).
export async function getCatalogoPublico(
  rolPrecio: "cliente" | "revendedor",
  filtros: FiltrosCatalogo = {},
): Promise<ProductoCatalogo[]> {
  const supabase = await createClient();

  let query = supabase
    .from("productos")
    .select(
      "id, sku, nombre, descripcion, precio_b2c, precio_b2b, categoria_id, marca_id, categorias(nombre), marcas(nombre)",
    )
    .eq("estado", "publicado");

  if (filtros.categoriaId) query = query.eq("categoria_id", filtros.categoriaId);
  if (filtros.marcaId) query = query.eq("marca_id", filtros.marcaId);
  if (filtros.precioMin !== undefined) query = query.gte("precio_b2c", filtros.precioMin);
  if (filtros.precioMax !== undefined) query = query.lte("precio_b2c", filtros.precioMax);

  const { data: productos, error } = await query.order("nombre");

  if (error) {
    console.error("Error al listar catalogo:", error.message);
    return [];
  }

  const { data: stockData, error: stockError } = await supabase.rpc(
    "stock_consolidado",
  );

  if (stockError) {
    console.error("Error al obtener stock consolidado:", stockError.message);
  }

  const stockPorProducto = new Map<string, number>(
    (stockData ?? []).map((s: { producto_id: string; cantidad_disponible: number }) => [
      s.producto_id,
      Number(s.cantidad_disponible),
    ]),
  );

  return (productos ?? []).map((p) => {
    const row = p as unknown as {
      id: string;
      sku: string;
      nombre: string;
      descripcion: string | null;
      precio_b2c: number;
      precio_b2b: number | null;
      categorias: { nombre: string } | null;
      marcas: { nombre: string } | null;
    };
    const precio =
      rolPrecio === "revendedor" && row.precio_b2b !== null
        ? row.precio_b2b
        : row.precio_b2c;
    const cantidad = stockPorProducto.get(row.id) ?? 0;

    return {
      id: row.id,
      sku: row.sku,
      nombre: row.nombre,
      descripcion: row.descripcion,
      precio,
      categoria: row.categorias?.nombre ?? null,
      marca: row.marcas?.nombre ?? null,
      disponible: cantidad > 0,
    };
  });
}
