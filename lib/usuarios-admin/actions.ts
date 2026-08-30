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

export const ROLES_LABELS: Record<string, string> = {
  cliente: "Cliente",
  revendedor: "Revendedor",
  encargado_deposito: "Encargado de depósito",
  vendedor: "Vendedor",
  gerente: "Gerente",
  administrador: "Administrador",
};

// Roles que el administrador puede asignar al crear un usuario interno nuevo
// (HU-002). Cliente y revendedor no entran acá: se generan solos por registro
// público (HU-001) o por la solicitud de revendedor (HU-003).
export const ROLES_INTERNOS = [
  "encargado_deposito",
  "vendedor",
  "gerente",
] as const;

export type RolInterno = (typeof ROLES_INTERNOS)[number];

export type CrearUsuarioInternoResult = UsuarioAdminActionResult & {
  passwordTemporal?: string;
  email?: string;
};

function generarPasswordTemporal(): string {
  const random = Math.random().toString(36).slice(-8);
  return `ZH-${random}-${new Date().getFullYear()}!`;
}

// Crea el usuario en auth (requiere service role, no hay otra forma de crear
// una cuenta sin pasar por el registro público) y despues le asigna el rol
// interno elegido con el cliente normal + la funcion asignar_rol_usuario,
// para que auth.uid() dentro de la funcion sea el admin logueado (mismo
// patron que cambiar_estado_usuario). La contraseña temporal se devuelve una
// sola vez para que el admin se la pase al empleado por fuera del sistema;
// no queda guardada en ningun lado.
export async function crearUsuarioInterno(
  formData: FormData,
): Promise<CrearUsuarioInternoResult> {
  if (!(await esAdministrador())) {
    return { error: "Solo un administrador puede crear usuarios internos" };
  }

  const nombre = String(formData.get("nombre") ?? "").trim();
  const apellido = String(formData.get("apellido") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const rolCodigo = String(formData.get("rol") ?? "").trim();

  if (!nombre || !apellido || !email) {
    return { error: "Nombre, apellido y email son obligatorios" };
  }
  if (!ROLES_INTERNOS.includes(rolCodigo as RolInterno)) {
    return {
      error:
        "Elegí un rol válido (Encargado de depósito, Vendedor o Gerente)",
    };
  }

  const admin = createAdminClient();
  const passwordTemporal = generarPasswordTemporal();

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password: passwordTemporal,
      email_confirm: true,
      user_metadata: { nombre, apellido },
    });

  if (createError || !created?.user) {
    return { error: createError?.message ?? "No se pudo crear el usuario" };
  }

  const supabase = await createClient();
  const { error: rolError } = await supabase.rpc("asignar_rol_usuario", {
    p_usuario_id: created.user.id,
    p_rol_codigo: rolCodigo,
  });

  if (rolError) {
    return {
      error: `El usuario se creó pero no se pudo asignar el rol: ${rolError.message}`,
    };
  }

  revalidatePath("/admin/usuarios");
  return { success: true, passwordTemporal, email };
}

// Cambia el rol de un usuario YA existente (por ejemplo, si se lo creó con
// el rol equivocado, o para promover/degradar a alguien).
export async function cambiarRolUsuario(
  usuarioId: string,
  rolCodigo: string,
): Promise<UsuarioAdminActionResult> {
  if (!(await esAdministrador())) {
    return { error: "Solo un administrador puede cambiar roles" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("asignar_rol_usuario", {
    p_usuario_id: usuarioId,
    p_rol_codigo: rolCodigo,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/usuarios");
  return { success: true };
}
