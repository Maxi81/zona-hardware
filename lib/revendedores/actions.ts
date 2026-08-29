"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserProfile } from "@/lib/auth/actions";
import { revalidatePath } from "next/cache";

export type SolicitudRevendedor = {
  id: string;
  usuario_id: string;
  cuit: string;
  estado: "pendiente" | "aprobada" | "rechazada";
  motivo_rechazo: string | null;
  created_at: string;
  usuarios: { nombre: string; apellido: string } | null;
};

export type RevendedorActionResult = { error?: string; success?: boolean };

export async function getMiSolicitudRevendedor(): Promise<SolicitudRevendedor | null> {
  const profile = await getCurrentUserProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("solicitudes_revendedor")
    .select(
      "id, usuario_id, cuit, estado, motivo_rechazo, created_at, usuarios(nombre, apellido)",
    )
    .eq("usuario_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as unknown as SolicitudRevendedor | null;
}

export async function solicitarAltaRevendedor(
  formData: FormData,
): Promise<RevendedorActionResult> {
  const cuit = String(formData.get("cuit") ?? "").trim();
  if (!cuit) return { error: "El CUIT es obligatorio" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("solicitar_alta_revendedor", {
    p_cuit: cuit,
  });

  if (error) return { error: error.message };

  revalidatePath("/catalogo/revendedor");
  return { success: true };
}

// Usa el cliente con service role: la RLS de usuarios solo deja ver la
// fila propia, y esta pantalla (solo para administrador, protegida por
// requireRole en la pagina) necesita mostrar nombre/apellido de otros
// usuarios. Se valida el rol antes de usarlo, igual que en usuarios-admin.
export async function getSolicitudesPendientes(): Promise<
  SolicitudRevendedor[]
> {
  const profile = await getCurrentUserProfile();
  if (profile?.roles?.[0]?.codigo !== "administrador") return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("solicitudes_revendedor")
    .select(
      "id, usuario_id, cuit, estado, motivo_rechazo, created_at, usuarios(nombre, apellido)",
    )
    .eq("estado", "pendiente")
    .order("created_at");

  if (error) {
    console.error("Error al listar solicitudes de revendedor:", error.message);
    return [];
  }
  return data as unknown as SolicitudRevendedor[];
}

export async function aprobarSolicitud(
  solicitudId: string,
): Promise<RevendedorActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("aprobar_solicitud_revendedor", {
    p_solicitud_id: solicitudId,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/revendedores");
  return { success: true };
}

export async function rechazarSolicitud(
  solicitudId: string,
  motivo: string,
): Promise<RevendedorActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("rechazar_solicitud_revendedor", {
    p_solicitud_id: solicitudId,
    p_motivo: motivo,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/revendedores");
  return { success: true };
}
