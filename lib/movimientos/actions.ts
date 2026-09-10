"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth/actions";
import { revalidatePath } from "next/cache";
import { esRolInterno } from "@/lib/site/roles";

export type ActionResult = { error?: string; success?: boolean };

export type ProductoLite = {
  id: string;
  sku: string;
  nombre: string;
};

export type DepositoConStock = {
  deposito_id: string;
  deposito_nombre: string;
  cantidad_disponible: number;
};

export type MovimientoStock = {
  id: string;
  created_at: string;
  deposito_id: string;
  deposito_nombre: string;
  producto_id: string;
  producto_sku: string;
  producto_nombre: string;
  tipo_codigo: string;
  tipo_signo: number;
  tipo_descripcion: string | null;
  cantidad: number;
  motivo: string | null;
  proveedor: string | null;
  orden_compra: string | null;
  referencia_tipo: string | null;
  transferencia_id: string | null;
  contraparte_deposito_id: string | null;
  contraparte_deposito_nombre: string | null;
  usuario_nombre: string | null;
  usuario_apellido: string | null;
};

export type FiltrosMovimientos = {
  depositoId?: string;
  productoId?: string;
  tipoCodigo?: string;
  desde?: string;
  hasta?: string;
};

// Escritura (registrar ingreso/egreso/transferencia): sin cambios de fondo,
// sigue siendo solo administrador y encargado de deposito - lo unico que
// cambio (10/09/2026) es que la transferencia ya no pasa por un flujo de
// aprobacion de varios pasos, se resuelve en un solo llamado (ver migracion
// 20260910000000_movimientos_stock_unificado.sql).
async function puedeGestionarMovimientos(): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  const codigo = profile?.roles?.[0]?.codigo;
  return codigo === "administrador" || codigo === "encargado_deposito";
}

// Lectura: los 4 roles internos (mismo criterio que el resto del panel).
async function puedeVerMovimientos(): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  return esRolInterno(profile?.roles?.[0]?.codigo);
}

export async function getProductosParaMovimientos(): Promise<ProductoLite[]> {
  if (!(await puedeVerMovimientos())) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("productos")
    .select("id, sku, nombre")
    .order("nombre");

  if (error) {
    console.error("Error al listar productos para movimientos:", error.message);
    return [];
  }
  return data as ProductoLite[];
}

// Que otros depositos de la red tienen stock disponible de un producto -
// se usa al armar una transferencia, para elegir el deposito de origen.
export async function buscarDepositosConStock(
  productoId: string,
  excluirDepositoId: string,
): Promise<DepositoConStock[]> {
  if (!productoId || !excluirDepositoId || !(await puedeVerMovimientos())) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("stock_disponible_en_red", {
    p_producto_id: productoId,
    p_excluir_deposito_id: excluirDepositoId,
  });

  if (error) {
    console.error("Error al buscar stock en la red:", error.message);
    return [];
  }
  return (data ?? []) as DepositoConStock[];
}

export async function getMovimientosStock(
  filtros: FiltrosMovimientos = {},
  limite = 100,
): Promise<MovimientoStock[]> {
  if (!(await puedeVerMovimientos())) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("listar_movimientos_stock", {
    p_deposito_id: filtros.depositoId || null,
    p_producto_id: filtros.productoId || null,
    p_tipo_codigo: filtros.tipoCodigo || null,
    p_desde: filtros.desde || null,
    p_hasta: filtros.hasta || null,
    p_limite: limite,
  });

  if (error) {
    console.error("Error al listar movimientos de stock:", error.message);
    return [];
  }
  return (data ?? []) as MovimientoStock[];
}

function revalidarMovimientos() {
  revalidatePath("/admin/movimientos");
  revalidatePath("/admin/productos");
  revalidatePath("/admin");
  revalidatePath("/catalogo");
  revalidatePath("/catalogo-mayorista");
}

export async function registrarIngreso(formData: FormData): Promise<ActionResult> {
  if (!(await puedeGestionarMovimientos())) {
    return { error: "No tenes permiso para registrar ingresos de stock" };
  }

  const productoId = String(formData.get("producto_id") ?? "").trim();
  const depositoId = String(formData.get("deposito_id") ?? "").trim();
  const cantidadRaw = String(formData.get("cantidad") ?? "").trim();
  const motivoIngreso = String(formData.get("motivo_ingreso") ?? "").trim();
  const proveedor = String(formData.get("proveedor") ?? "").trim() || null;
  const ordenCompra = String(formData.get("orden_compra") ?? "").trim() || null;
  const detalle = String(formData.get("detalle") ?? "").trim() || null;

  if (!productoId || !depositoId || !cantidadRaw || !motivoIngreso) {
    return { error: "Producto, depósito, motivo y cantidad son obligatorios" };
  }

  const cantidad = Number(cantidadRaw);
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    return { error: "La cantidad tiene que ser un entero mayor a 0" };
  }

  const esAjuste = motivoIngreso === "ajuste";
  const tipoCodigo = esAjuste ? "AJUSTE_POSITIVO" : "INGRESO";

  if (esAjuste && !detalle) {
    return { error: "El detalle es obligatorio para un ajuste" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_movimiento_stock", {
    p_producto_id: productoId,
    p_deposito_id: depositoId,
    p_tipo_codigo: tipoCodigo,
    p_cantidad: cantidad,
    p_motivo: detalle,
    p_proveedor: esAjuste ? null : proveedor,
    p_orden_compra: esAjuste ? null : ordenCompra,
  });

  if (error) return { error: error.message };

  revalidarMovimientos();
  return { success: true };
}

export async function registrarEgreso(formData: FormData): Promise<ActionResult> {
  if (!(await puedeGestionarMovimientos())) {
    return { error: "No tenes permiso para registrar egresos de stock" };
  }

  const productoId = String(formData.get("producto_id") ?? "").trim();
  const depositoId = String(formData.get("deposito_id") ?? "").trim();
  const cantidadRaw = String(formData.get("cantidad") ?? "").trim();
  const motivoEgreso = String(formData.get("motivo_egreso") ?? "").trim();
  const detalle = String(formData.get("detalle") ?? "").trim() || null;

  if (!productoId || !depositoId || !cantidadRaw || !motivoEgreso) {
    return { error: "Producto, depósito, motivo y cantidad son obligatorios" };
  }

  const cantidad = Number(cantidadRaw);
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    return { error: "La cantidad tiene que ser un entero mayor a 0" };
  }

  const esAjuste = motivoEgreso === "ajuste";

  if (esAjuste && !detalle) {
    return { error: "El detalle es obligatorio para un ajuste" };
  }

  const tipoCodigo = esAjuste ? "AJUSTE_NEGATIVO" : "EGRESO_OTRO";

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_movimiento_stock", {
    p_producto_id: productoId,
    p_deposito_id: depositoId,
    p_tipo_codigo: tipoCodigo,
    p_cantidad: cantidad,
    p_motivo: detalle,
  });

  if (error) return { error: error.message };

  revalidarMovimientos();
  return { success: true };
}

export async function registrarTransferencia(formData: FormData): Promise<ActionResult> {
  if (!(await puedeGestionarMovimientos())) {
    return { error: "No tenes permiso para registrar transferencias de stock" };
  }

  const productoId = String(formData.get("producto_id") ?? "").trim();
  const depositoOrigenId = String(formData.get("deposito_origen_id") ?? "").trim();
  const depositoDestinoId = String(formData.get("deposito_destino_id") ?? "").trim();
  const cantidadRaw = String(formData.get("cantidad") ?? "").trim();
  const detalle = String(formData.get("detalle") ?? "").trim() || null;

  if (!productoId || !depositoOrigenId || !depositoDestinoId || !cantidadRaw) {
    return {
      error: "Producto, depósito de origen, depósito de destino y cantidad son obligatorios",
    };
  }

  if (depositoOrigenId === depositoDestinoId) {
    return { error: "El depósito de origen y el de destino no pueden ser el mismo" };
  }

  const cantidad = Number(cantidadRaw);
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    return { error: "La cantidad tiene que ser un entero mayor a 0" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_transferencia_directa", {
    p_producto_id: productoId,
    p_deposito_origen_id: depositoOrigenId,
    p_deposito_destino_id: depositoDestinoId,
    p_cantidad: cantidad,
    p_motivo: detalle,
  });

  if (error) return { error: error.message };

  revalidarMovimientos();
  return { success: true };
}
