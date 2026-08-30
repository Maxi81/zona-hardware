"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth/actions";
import { revalidatePath } from "next/cache";

export type ActionResult = { error?: string; success?: boolean };

export type ProductoLite = {
  id: string;
  sku: string;
  nombre: string;
};

export type StockDeposito = {
  id: string;
  producto_id: string;
  cantidad_disponible: number;
  cantidad_reservada: number;
  punto_reposicion: number | null;
  productos: { sku: string; nombre: string } | null;
};

export type StockConsolidadoDetalle = {
  producto_id: string;
  sku: string;
  nombre: string;
  cantidad_total: number;
};

export type MovimientoStock = {
  id: string;
  producto_id: string;
  cantidad: number;
  motivo: string | null;
  created_at: string;
  productos: { nombre: string } | null;
  tipo_movimiento_stock: { codigo: string; signo: number } | null;
};

async function puedeGestionarStock(): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  const codigo = profile?.roles?.[0]?.codigo;
  return codigo === "administrador" || codigo === "encargado_deposito";
}

// Productos para los selects de las pantallas de deposito: incluye
// borradores (el encargado necesita poder cargar stock antes de publicar).
export async function getProductosParaStock(): Promise<ProductoLite[]> {
  if (!(await puedeGestionarStock())) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("productos")
    .select("id, sku, nombre")
    .order("nombre");

  if (error) {
    console.error("Error al listar productos para stock:", error.message);
    return [];
  }
  return data as ProductoLite[];
}

export async function getStockPorDeposito(depositoId: string): Promise<StockDeposito[]> {
  if (!depositoId || !(await puedeGestionarStock())) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stock")
    .select(
      "id, producto_id, cantidad_disponible, cantidad_reservada, punto_reposicion, productos(sku, nombre)",
    )
    .eq("deposito_id", depositoId)
    .order("producto_id");

  if (error) {
    console.error("Error al listar stock del deposito:", error.message);
    return [];
  }
  return data as unknown as StockDeposito[];
}

export async function getStockConsolidadoDetalle(): Promise<StockConsolidadoDetalle[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("stock_consolidado_detalle");

  if (error) {
    console.error("Error al obtener el stock consolidado:", error.message);
    return [];
  }
  return (data ?? []) as StockConsolidadoDetalle[];
}

export async function getMovimientosRecientes(
  depositoId: string,
  limite = 10,
): Promise<MovimientoStock[]> {
  if (!depositoId || !(await puedeGestionarStock())) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("movimientos_stock")
    .select(
      "id, producto_id, cantidad, motivo, created_at, productos(nombre), tipo_movimiento_stock(codigo, signo)",
    )
    .eq("deposito_id", depositoId)
    .order("created_at", { ascending: false })
    .limit(limite);

  if (error) {
    console.error("Error al listar movimientos recientes:", error.message);
    return [];
  }
  return data as unknown as MovimientoStock[];
}

export async function registrarIngreso(formData: FormData): Promise<ActionResult> {
  if (!(await puedeGestionarStock())) {
    return { error: "No tenes permiso para registrar ingresos de stock" };
  }

  const productoId = String(formData.get("producto_id") ?? "").trim();
  const depositoId = String(formData.get("deposito_id") ?? "").trim();
  const cantidadRaw = String(formData.get("cantidad") ?? "").trim();
  const motivo = String(formData.get("motivo") ?? "").trim() || null;

  if (!productoId || !depositoId || !cantidadRaw) {
    return { error: "Producto, depósito y cantidad son obligatorios" };
  }

  const cantidad = Number(cantidadRaw);
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    return { error: "La cantidad tiene que ser un entero mayor a 0" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_movimiento_stock", {
    p_producto_id: productoId,
    p_deposito_id: depositoId,
    p_tipo_codigo: "INGRESO",
    p_cantidad: cantidad,
    p_motivo: motivo,
    p_referencia_tipo: null,
    p_referencia_id: null,
  });

  if (error) return { error: error.message };

  revalidatePath("/deposito");
  revalidatePath("/admin/productos");
  revalidatePath("/catalogo");
  revalidatePath("/catalogo-mayorista");
  return { success: true };
}
