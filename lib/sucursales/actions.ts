"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type Sucursal = {
  id: string;
  nombre: string;
  direccion: string | null;
  ciudad: string | null;
  provincia: string | null;
  estado: "activa" | "inactiva";
  deposito_id: string;
  depositos: { nombre: string } | null;
};

export async function getSucursales(): Promise<Sucursal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sucursales")
    .select(
      "id, nombre, direccion, ciudad, provincia, estado, deposito_id, depositos(nombre)",
    )
    .order("nombre");

  if (error) {
    console.error("Error al listar sucursales:", error.message);
    return [];
  }
  return data as unknown as Sucursal[];
}

export type SucursalActionResult = { error?: string; success?: boolean };

export async function crearSucursal(
  formData: FormData,
): Promise<SucursalActionResult> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const direccion = String(formData.get("direccion") ?? "").trim() || null;
  const ciudad = String(formData.get("ciudad") ?? "").trim() || null;
  const provincia = String(formData.get("provincia") ?? "").trim() || null;

  if (!nombre) {
    return { error: "El nombre de la sucursal es obligatorio" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("crear_sucursal", {
    p_nombre: nombre,
    p_direccion: direccion,
    p_ciudad: ciudad,
    p_provincia: provincia,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/sucursales");
  return { success: true };
}

export async function darBajaSucursal(
  sucursalId: string,
): Promise<SucursalActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("dar_baja_sucursal", {
    p_sucursal_id: sucursalId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/sucursales");
  return { success: true };
}
