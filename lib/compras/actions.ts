"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth/actions";
import { esRolInterno } from "@/lib/site/roles";
import { revalidatePath } from "next/cache";

export type ActionResult = { error?: string; success?: boolean };

export type ItemOrdenCompra = {
  producto_id: string;
  cantidad_pedida: number;
  precio_unitario: number | null;
};

export type OrdenCompra = {
  id: string;
  numero: number;
  proveedor_id: string;
  proveedor_nombre: string;
  deposito_id: string;
  deposito_nombre: string;
  estado: "borrador" | "emitida" | "recibida" | "cancelada";
  fecha_creacion: string;
  fecha_emision: string | null;
  fecha_recepcion: string | null;
  notas: string | null;
  monto_total: number;
  cantidad_items: number;
};

export type FiltrosOrdenesCompra = {
  estado?: string;
  proveedorId?: string;
  depositoId?: string;
};

export type DeudaProveedor = {
  proveedor_id: string;
  proveedor_nombre: string;
  monto_recibido: number;
  monto_pagado: number;
  deuda: number;
};

async function esPersonalInterno(): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  return esRolInterno(profile?.roles?.[0]?.codigo);
}

async function esAdministrador(): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  return profile?.roles?.[0]?.codigo === "administrador";
}

// Cargar el remito de recepcion afecta el stock del deposito, mismo
// criterio de permiso que registrar_movimiento_stock (admin o encargado de
// deposito). Crear/emitir OC y pagos siguen siendo admin-only (ver
// migracion 20260910010000_compras_proveedores.sql).
async function puedeCargarRemito(): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  const codigo = profile?.roles?.[0]?.codigo;
  return codigo === "administrador" || codigo === "encargado_deposito";
}

function revalidarCompras() {
  revalidatePath("/admin/compras");
  revalidatePath("/admin/movimientos");
  revalidatePath("/admin");
}

export function formatearNumeroOC(numero: number): string {
  return `OC-${String(numero).padStart(4, "0")}`;
}

export async function getOrdenesCompra(
  filtros: FiltrosOrdenesCompra = {},
  limite = 100,
): Promise<OrdenCompra[]> {
  if (!(await esPersonalInterno())) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("listar_ordenes_compra", {
    p_estado: filtros.estado || null,
    p_proveedor_id: filtros.proveedorId || null,
    p_deposito_id: filtros.depositoId || null,
    p_limite: limite,
  });

  if (error) {
    console.error("Error al listar ordenes de compra:", error.message);
    return [];
  }
  return (data ?? []) as OrdenCompra[];
}

export async function crearOrdenCompra(
  proveedorId: string,
  depositoId: string,
  items: ItemOrdenCompra[],
  notas: string | null,
): Promise<ActionResult> {
  if (!(await esAdministrador())) {
    return { error: "Solo un administrador puede crear ordenes de compra" };
  }

  if (!proveedorId || !depositoId) {
    return { error: "Proveedor y depósito son obligatorios" };
  }

  if (!items.length) {
    return { error: "La orden de compra necesita al menos un ítem" };
  }

  for (const item of items) {
    if (
      !item.producto_id ||
      !Number.isInteger(item.cantidad_pedida) ||
      item.cantidad_pedida <= 0
    ) {
      return { error: "Cada ítem necesita un producto y una cantidad entera mayor a 0" };
    }
    if (
      item.precio_unitario !== null &&
      (Number.isNaN(item.precio_unitario) || item.precio_unitario < 0)
    ) {
      return { error: "El precio unitario tiene que ser un número válido" };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("crear_orden_compra", {
    p_proveedor_id: proveedorId,
    p_deposito_id: depositoId,
    p_items: items,
    p_notas: notas,
  });

  if (error) return { error: error.message };

  revalidarCompras();
  return { success: true };
}

export async function emitirOrdenCompra(ordenCompraId: string): Promise<ActionResult> {
  if (!(await esAdministrador())) {
    return { error: "Solo un administrador puede emitir órdenes de compra" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("emitir_orden_compra", {
    p_orden_compra_id: ordenCompraId,
  });

  if (error) return { error: error.message };

  revalidarCompras();
  return { success: true };
}

export async function registrarRemito(ordenCompraId: string): Promise<ActionResult> {
  if (!(await puedeCargarRemito())) {
    return { error: "No tenés permiso para cargar el remito de esta orden de compra" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_remito", {
    p_orden_compra_id: ordenCompraId,
  });

  if (error) return { error: error.message };

  revalidarCompras();
  return { success: true };
}

export async function getDeudaProveedores(): Promise<DeudaProveedor[]> {
  if (!(await esAdministrador())) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("listar_deuda_proveedores");

  if (error) {
    console.error("Error al listar deuda a proveedores:", error.message);
    return [];
  }
  return (data ?? []) as DeudaProveedor[];
}

export async function registrarPagoProveedores(
  proveedorIds: string[],
): Promise<ActionResult> {
  if (!(await esAdministrador())) {
    return { error: "Solo un administrador puede registrar pagos a proveedores" };
  }

  if (!proveedorIds.length) {
    return { error: "Elegí al menos un proveedor para pagar" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_pago_proveedores", {
    p_proveedor_ids: proveedorIds,
  });

  if (error) return { error: error.message };

  revalidarCompras();
  return { success: true };
}
