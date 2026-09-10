"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth/actions";
import { esRolInterno } from "@/lib/site/roles";
import { revalidatePath } from "next/cache";

export type ActionResult = { error?: string; success?: boolean };

export type Proveedor = {
  id: string;
  nombre: string;
  cuit: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  estado: "activo" | "inactivo";
};

// Mismo criterio que productos/movimientos: los 4 roles internos pueden VER
// proveedores (los necesitan para armar una orden de compra), crear/dar de
// baja sigue siendo admin-only (ver migracion 20260910010000).
async function esPersonalInterno(): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  return esRolInterno(profile?.roles?.[0]?.codigo);
}

async function esAdministrador(): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  return profile?.roles?.[0]?.codigo === "administrador";
}

export async function getProveedores(): Promise<Proveedor[]> {
  if (!(await esPersonalInterno())) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proveedores")
    .select("id, nombre, cuit, email, telefono, direccion, estado")
    .order("nombre");

  if (error) {
    console.error("Error al listar proveedores:", error.message);
    return [];
  }
  return data as Proveedor[];
}

export async function crearProveedor(formData: FormData): Promise<ActionResult> {
  if (!(await esAdministrador())) {
    return { error: "Solo un administrador puede crear proveedores" };
  }

  const nombre = String(formData.get("nombre") ?? "").trim();
  const cuit = String(formData.get("cuit") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const telefono = String(formData.get("telefono") ?? "").trim() || null;
  const direccion = String(formData.get("direccion") ?? "").trim() || null;

  if (!nombre) return { error: "El nombre del proveedor es obligatorio" };

  const supabase = await createClient();
  const { error } = await supabase.from("proveedores").insert({
    nombre,
    cuit,
    email,
    telefono,
    direccion,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/proveedores");
  revalidatePath("/admin/compras");
  return { success: true };
}

export async function cambiarEstadoProveedor(
  proveedorId: string,
  nuevoEstado: "activo" | "inactivo",
): Promise<ActionResult> {
  if (!(await esAdministrador())) {
    return { error: "Solo un administrador puede cambiar el estado de un proveedor" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("proveedores")
    .update({ estado: nuevoEstado })
    .eq("id", proveedorId);

  if (error) return { error: error.message };

  revalidatePath("/admin/proveedores");
  revalidatePath("/admin/compras");
  return { success: true };
}
