"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth/actions";
import { revalidatePath } from "next/cache";

export type Direccion = {
  id: string;
  calle: string;
  numero: string | null;
  ciudad: string;
  provincia: string;
  codigo_postal: string | null;
  principal: boolean;
};

export type PerfilActionResult = { error?: string; success?: boolean };

export async function getMisDirecciones(): Promise<Direccion[]> {
  const profile = await getCurrentUserProfile();
  if (!profile) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("direcciones")
    .select("id, calle, numero, ciudad, provincia, codigo_postal, principal")
    .eq("usuario_id", profile.id)
    .order("principal", { ascending: false })
    .order("created_at");

  if (error) {
    console.error("Error al listar direcciones:", error.message);
    return [];
  }
  return data as Direccion[];
}

export async function actualizarDatosPersonales(
  formData: FormData,
): Promise<PerfilActionResult> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const apellido = String(formData.get("apellido") ?? "").trim();

  if (!nombre || !apellido) {
    return { error: "Nombre y apellido son obligatorios" };
  }

  const profile = await getCurrentUserProfile();
  if (!profile) return { error: "No hay una sesión activa" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("usuarios")
    .update({ nombre, apellido })
    .eq("id", profile.id);

  if (error) return { error: error.message };

  revalidatePath("/perfil");
  return { success: true };
}

export async function agregarDireccion(
  formData: FormData,
): Promise<PerfilActionResult> {
  const calle = String(formData.get("calle") ?? "").trim();
  const numero = String(formData.get("numero") ?? "").trim() || null;
  const ciudad = String(formData.get("ciudad") ?? "").trim();
  const provincia = String(formData.get("provincia") ?? "").trim();
  const codigo_postal = String(formData.get("codigo_postal") ?? "").trim() || null;
  const principal = formData.get("principal") === "on";

  if (!calle || !ciudad || !provincia) {
    return { error: "Calle, ciudad y provincia son obligatorios" };
  }

  const profile = await getCurrentUserProfile();
  if (!profile) return { error: "No hay una sesión activa" };

  const supabase = await createClient();
  const { error } = await supabase.from("direcciones").insert({
    usuario_id: profile.id,
    calle,
    numero,
    ciudad,
    provincia,
    codigo_postal,
    principal,
  });

  if (error) return { error: error.message };

  revalidatePath("/perfil");
  return { success: true };
}

export async function eliminarDireccion(
  direccionId: string,
): Promise<PerfilActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("direcciones")
    .delete()
    .eq("id", direccionId);

  if (error) return { error: error.message };

  revalidatePath("/perfil");
  return { success: true };
}

export async function marcarDireccionPrincipal(
  direccionId: string,
): Promise<PerfilActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("direcciones")
    .update({ principal: true })
    .eq("id", direccionId);

  if (error) return { error: error.message };

  revalidatePath("/perfil");
  return { success: true };
}
