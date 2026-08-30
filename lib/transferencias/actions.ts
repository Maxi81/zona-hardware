"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth/actions";
import { revalidatePath } from "next/cache";

export type ActionResult = { error?: string; success?: boolean };

export type DepositoConStock = {
  deposito_id: string;
  deposito_nombre: string;
  cantidad_disponible: number;
};

export type Transferencia = {
  id: string;
  producto_id: string;
  deposito_origen_id: string;
  deposito_destino_id: string;
  cantidad: number;
  cantidad_recibida: number | null;
  estado:
    | "pendiente_aprobacion"
    | "aprobada"
    | "rechazada"
    | "en_transito"
    | "completada";
  motivo_rechazo: string | null;
  created_at: string;
  productos: { sku: string; nombre: string } | null;
  origen: { nombre: string } | null;
  destino: { nombre: string } | null;
};

async function puedeGestionarTransferencias(): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  const codigo = profile?.roles?.[0]?.codigo;
  return codigo === "administrador" || codigo === "encargado_deposito";
}

export async function buscarStockEnRed(
  productoId: string,
  excluirDepositoId: string,
): Promise<DepositoConStock[]> {
  if (!productoId || !excluirDepositoId || !(await puedeGestionarTransferencias())) {
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

// Transferencias donde este deposito participa (como origen o destino),
// en cualquier estado -- sirve tanto para "lo que pedi" como "lo que me
// piden" sin duplicar consultas.
export async function getTransferenciasDelDeposito(
  depositoId: string,
): Promise<Transferencia[]> {
  if (!depositoId || !(await puedeGestionarTransferencias())) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transferencias_stock")
    .select(
      "id, producto_id, deposito_origen_id, deposito_destino_id, cantidad, cantidad_recibida, estado, motivo_rechazo, created_at, productos(sku, nombre), origen:depositos!transferencias_stock_deposito_origen_id_fkey(nombre), destino:depositos!transferencias_stock_deposito_destino_id_fkey(nombre)",
    )
    .or(`deposito_origen_id.eq.${depositoId},deposito_destino_id.eq.${depositoId}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error al listar transferencias del deposito:", error.message);
    return [];
  }
  return data as unknown as Transferencia[];
}

export async function solicitarTransferencia(
  formData: FormData,
): Promise<ActionResult> {
  if (!(await puedeGestionarTransferencias())) {
    return { error: "No tenes permiso para solicitar transferencias" };
  }

  const productoId = String(formData.get("producto_id") ?? "").trim();
  const depositoOrigenId = String(formData.get("deposito_origen_id") ?? "").trim();
  const depositoDestinoId = String(formData.get("deposito_destino_id") ?? "").trim();
  const cantidadRaw = String(formData.get("cantidad") ?? "").trim();

  if (!productoId || !depositoOrigenId || !depositoDestinoId || !cantidadRaw) {
    return { error: "Producto, deposito de origen, deposito propio y cantidad son obligatorios" };
  }

  const cantidad = Number(cantidadRaw);
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    return { error: "La cantidad tiene que ser un entero mayor a 0" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("solicitar_transferencia", {
    p_producto_id: productoId,
    p_deposito_origen_id: depositoOrigenId,
    p_deposito_destino_id: depositoDestinoId,
    p_cantidad: cantidad,
  });

  if (error) return { error: error.message };

  revalidatePath("/deposito/transferencias");
  return { success: true };
}

export async function resolverTransferencia(
  transferenciaId: string,
  aprobar: boolean,
  motivoRechazo?: string,
): Promise<ActionResult> {
  if (!(await puedeGestionarTransferencias())) {
    return { error: "No tenes permiso para resolver transferencias" };
  }

  if (!aprobar && !motivoRechazo?.trim()) {
    return { error: "El motivo del rechazo es obligatorio" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("resolver_transferencia", {
    p_transferencia_id: transferenciaId,
    p_aprobar: aprobar,
    p_motivo_rechazo: aprobar ? null : motivoRechazo,
  });

  if (error) return { error: error.message };

  revalidatePath("/deposito/transferencias");
  return { success: true };
}

export async function despacharTransferencia(
  transferenciaId: string,
): Promise<ActionResult> {
  if (!(await puedeGestionarTransferencias())) {
    return { error: "No tenes permiso para despachar transferencias" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("despachar_transferencia", {
    p_transferencia_id: transferenciaId,
  });

  if (error) return { error: error.message };

  revalidatePath("/deposito/transferencias");
  revalidatePath("/deposito");
  return { success: true };
}

export async function confirmarRecepcionTransferencia(
  formData: FormData,
): Promise<ActionResult> {
  if (!(await puedeGestionarTransferencias())) {
    return { error: "No tenes permiso para confirmar recepciones" };
  }

  const transferenciaId = String(formData.get("transferencia_id") ?? "").trim();
  const cantidadRaw = String(formData.get("cantidad_recibida") ?? "").trim();

  if (!transferenciaId || !cantidadRaw) {
    return { error: "Falta la transferencia o la cantidad recibida" };
  }

  const cantidadRecibida = Number(cantidadRaw);
  if (!Number.isInteger(cantidadRecibida) || cantidadRecibida <= 0) {
    return { error: "La cantidad recibida tiene que ser un entero mayor a 0" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("confirmar_recepcion_transferencia", {
    p_transferencia_id: transferenciaId,
    p_cantidad_recibida: cantidadRecibida,
  });

  if (error) return { error: error.message };

  revalidatePath("/deposito/transferencias");
  revalidatePath("/deposito");
  return { success: true };
}
