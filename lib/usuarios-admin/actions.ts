"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserProfile } from "@/lib/auth/actions";
import { revalidatePath } from "next/cache";

export type UsuarioAdmin = {
  id: string;
  nombre: string;
  apellido: string;
  cuit: string | null;
  estado: "activo" | "inactivo";
  email: string | null;
  roles: { codigo: string; descripcion: string | null }[];
};

export type UsuarioAdminActionResult = { error?: string; success?: boolean };

async function esAdministrador(): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  return profile?.roles?.[0]?.codigo === "administrador";
}

// Lista todos los usuarios con su email (solo lo tiene auth.users, que no es
// legible por RLS). Requiere el cliente con service role; por eso se valida
// primero, con el cliente normal, que quien llama es un admin activo.
export async function getUsuariosAdmin(): Promise<UsuarioAdmin[]> {
  if (!(await esAdministrador())) return [];

  const admin = createAdminClient();

  const { data: usuarios, error } = await admin
    .from("usuarios")
    .select("id, nombre, apellido, cuit, estado, roles(codigo, descripcion)")
    .order("nombre");

  if (error) {
    console.error("Error al listar usuarios:", error.message);
    return [];
  }

  const { data: authUsers } = await admin.auth.admin.listUsers({
    perPage: 200,
  });
  const emailPorId = new Map(
    authUsers?.users.map((u) => [u.id, u.email ?? null]) ?? [],
  );

  return (usuarios ?? []).map((u) => {
    const rolesRaw = (u as { roles: unknown }).roles;
    const roles = Array.isArray(rolesRaw)
      ? rolesRaw
      : rolesRaw
        ? [rolesRaw]
        : [];
    return {
      ...u,
      roles,
      email: emailPorId.get(u.id) ?? null,
    };
  }) as unknown as UsuarioAdmin[];
}

// El cambio de estado en si pasa por la funcion SECURITY DEFINER
// cambiar_estado_usuario, con el cliente normal (para que auth.uid()
// dentro de la funcion sea el admin que esta logueado).
export async function cambiarEstadoUsuario(
  usuarioId: string,
  nuevoEstado: "activo" | "inactivo",
  motivo: string,
): Promise<UsuarioAdminActionResult> {
  if (!motivo.trim()) {
    return { error: "El motivo es obligatorio" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("cambiar_estado_usuario", {
    p_user_id: usuarioId,
    p_nuevo_estado: nuevoEstado,
    p_motivo: motivo,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/usuarios");
  return { success: true };
}
