"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export type AuthActionResult = {
  error?: string;
  success?: boolean;
};

export type UserProfile = {
  id: string;
  nombre: string;
  apellido: string;
  cuit: string | null;
  rol_id: string;
  estado: "activo" | "inactivo";
  created_at: string;
  updated_at: string;
  roles: {
    codigo: string;
    descripcion: string | null;
  }[];
};

export async function signUp(
  email: string,
  password: string,
  nombre: string,
  apellido: string,
): Promise<AuthActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nombre, apellido },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/protected`,
    },
  });

  return error ? { error: error.message } : { success: true };
}

export async function signIn(
  email: string,
  password: string,
): Promise<AuthActionResult> {
  const supabase = await createClient();
  const { data: authData, error: signInError } =
    await supabase.auth.signInWithPassword({
    email,
    password,
    });

  if (signInError || !authData.user) {
    return { error: signInError?.message ?? "No se pudo iniciar sesión" };
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminClient();
  } catch (error) {
    await supabase.auth.signOut();
    return {
      error:
        error instanceof Error
          ? error.message
          : "No se pudo validar el perfil del usuario",
    };
  }

  const { data: perfil, error: perfilError } = await supabaseAdmin
    .from("usuarios")
    .select("estado, roles!inner(codigo)")
    .eq("id", authData.user.id)
    .single();

  if (perfilError || !perfil || perfil.estado !== "activo") {
    await supabase.auth.signOut();
    return { error: "Cuenta inactiva o pendiente de autorización" };
  }

  const destinations: Record<string, string> = {
    administrador: "/admin",
    encargado_deposito: "/deposito",
    vendedor: "/ventas",
    gerente: "/gerencia",
    cliente: "/catalogo",
    revendedor: "/catalogo-mayorista",
  };
  const roles = perfil.roles as
    | { codigo: string }
    | { codigo: string }[]
    | null;
  const codigoRol = Array.isArray(roles) ? roles[0]?.codigo : roles?.codigo;
  const destination = codigoRol ? destinations[codigoRol] : undefined;

  if (!destination) {
    await supabase.auth.signOut();
    return { error: "La cuenta no tiene un rol de acceso válido" };
  }

  redirect(destination);
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return null;

  const { data, error } = await supabase
    .from("usuarios")
    .select(
      "id, nombre, apellido, cuit, rol_id, estado, created_at, updated_at, roles(codigo, descripcion)",
    )
    .eq("id", claims.claims.sub)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as UserProfile;
}