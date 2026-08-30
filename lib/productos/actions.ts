"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth/actions";
import { revalidatePath } from "next/cache";

export type ActionResult = { error?: string; success?: boolean };

export type Categoria = {
  id: string;
  nombre: string;
  categoria_padre_id: string | null;
};

export type Marca = {
  id: string;
  nombre: string;
};

export type Deposito = {
  id: string;
  nombre: string;
};

export type ProductoAdmin = {
  id: string;
  sku: string;
  nombre: string;
  descripcion: string | null;
  categoria_id: string;
  marca_id: string;
  precio_b2c: number;
  precio_b2b: number | null;
  estado: "borrador" | "publicado" | "baja";
  categorias: { nombre: string } | null;
  marcas: { nombre: string } | null;
};

export type StockAdmin = {
  id: string;
  producto_id: string;
  deposito_id: string;
  cantidad_disponible: number;
  depositos: { nombre: string } | null;
};

async function esAdministrador(): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  return profile?.roles?.[0]?.codigo === "administrador";
}

export async function getCategorias(): Promise<Categoria[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categorias")
    .select("id, nombre, categoria_padre_id")
    .order("nombre");

  if (error) {
    console.error("Error al listar categorias:", error.message);
    return [];
  }
  return data as Categoria[];
}

export async function getMarcas(): Promise<Marca[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marcas")
    .select("id, nombre")
    .order("nombre");

  if (error) {
    console.error("Error al listar marcas:", error.message);
    return [];
  }
  return data as Marca[];
}

export async function getDepositos(): Promise<Deposito[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("depositos")
    .select("id, nombre")
    .order("nombre");

  if (error) {
    console.error("Error al listar depositos:", error.message);
    return [];
  }
  return data as Deposito[];
}

export async function crearCategoria(formData: FormData): Promise<ActionResult> {
  if (!(await esAdministrador())) {
    return { error: "Solo un administrador puede crear categorias" };
  }
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return { error: "El nombre de la categoria es obligatorio" };

  const supabase = await createClient();
  const { error } = await supabase.from("categorias").insert({ nombre });
  if (error) return { error: error.message };

  revalidatePath("/admin/productos");
  return { success: true };
}

export async function crearMarca(formData: FormData): Promise<ActionResult> {
  if (!(await esAdministrador())) {
    return { error: "Solo un administrador puede crear marcas" };
  }
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return { error: "El nombre de la marca es obligatorio" };

  const supabase = await createClient();
  const { error } = await supabase.from("marcas").insert({ nombre });
  if (error) return { error: error.message };

  revalidatePath("/admin/productos");
  return { success: true };
}

export async function getProductosAdmin(): Promise<ProductoAdmin[]> {
  if (!(await esAdministrador())) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("productos")
    .select(
      "id, sku, nombre, descripcion, categoria_id, marca_id, precio_b2c, precio_b2b, estado, categorias(nombre), marcas(nombre)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error al listar productos:", error.message);
    return [];
  }
  return data as unknown as ProductoAdmin[];
}

export async function crearProducto(formData: FormData): Promise<ActionResult> {
  if (!(await esAdministrador())) {
    return { error: "Solo un administrador puede crear productos" };
  }

  const sku = String(formData.get("sku") ?? "").trim();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const categoriaId = String(formData.get("categoria_id") ?? "").trim();
  const marcaId = String(formData.get("marca_id") ?? "").trim();
  const precioB2cRaw = String(formData.get("precio_b2c") ?? "").trim();
  const precioB2bRaw = String(formData.get("precio_b2b") ?? "").trim();
  const imagenUrl = String(formData.get("imagen_url") ?? "").trim();

  if (!sku || !nombre || !categoriaId || !marcaId || !precioB2cRaw) {
    return { error: "SKU, nombre, categoria, marca y precio son obligatorios" };
  }

  const precioB2c = Number(precioB2cRaw);
  if (Number.isNaN(precioB2c) || precioB2c < 0) {
    return { error: "El precio B2C tiene que ser un numero valido" };
  }

  let precioB2b: number | null = null;
  if (precioB2bRaw) {
    precioB2b = Number(precioB2bRaw);
    if (Number.isNaN(precioB2b) || precioB2b < 0) {
      return { error: "El precio B2B tiene que ser un numero valido" };
    }
  }

  const supabase = await createClient();
  const { data: producto, error } = await supabase
    .from("productos")
    .insert({
      sku,
      nombre,
      descripcion,
      categoria_id: categoriaId,
      marca_id: marcaId,
      precio_b2c: precioB2c,
      precio_b2b: precioB2b,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (imagenUrl && producto) {
    const { error: imgError } = await supabase
      .from("producto_imagenes")
      .insert({ producto_id: producto.id, url: imagenUrl, orden: 0 });
    if (imgError) {
      console.error("Error al guardar imagen del producto:", imgError.message);
    }
  }

  revalidatePath("/admin/productos");
  return { success: true };
}

export async function cambiarEstadoProducto(
  productoId: string,
  nuevoEstado: "borrador" | "publicado" | "baja",
): Promise<ActionResult> {
  if (!(await esAdministrador())) {
    return { error: "Solo un administrador puede cambiar el estado de un producto" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("productos")
    .update({ estado: nuevoEstado })
    .eq("id", productoId);

  if (error) return { error: error.message };

  revalidatePath("/admin/productos");
  revalidatePath("/catalogo");
  revalidatePath("/catalogo-mayorista");
  return { success: true };
}

export async function getStockAdmin(): Promise<StockAdmin[]> {
  if (!(await esAdministrador())) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stock")
    .select("id, producto_id, deposito_id, cantidad_disponible, depositos(nombre)")
    .order("producto_id");

  if (error) {
    console.error("Error al listar stock:", error.message);
    return [];
  }
  return data as unknown as StockAdmin[];
}

export async function actualizarStock(formData: FormData): Promise<ActionResult> {
  if (!(await esAdministrador())) {
    return { error: "Solo un administrador puede actualizar el stock" };
  }

  const productoId = String(formData.get("producto_id") ?? "").trim();
  const depositoId = String(formData.get("deposito_id") ?? "").trim();
  const cantidadRaw = String(formData.get("cantidad_disponible") ?? "").trim();

  if (!productoId || !depositoId || !cantidadRaw) {
    return { error: "Producto, deposito y cantidad son obligatorios" };
  }

  const cantidad = Number(cantidadRaw);
  if (!Number.isInteger(cantidad) || cantidad < 0) {
    return { error: "La cantidad tiene que ser un entero mayor o igual a 0" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("stock")
    .upsert(
      { producto_id: productoId, deposito_id: depositoId, cantidad_disponible: cantidad },
      { onConflict: "producto_id,deposito_id" },
    );

  if (error) return { error: error.message };

  revalidatePath("/admin/productos");
  revalidatePath("/catalogo");
  revalidatePath("/catalogo-mayorista");
  return { success: true };
}
