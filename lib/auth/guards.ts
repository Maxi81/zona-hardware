import { redirect } from "next/navigation";
import { getCurrentUserProfile, type UserProfile } from "@/lib/auth/actions";

/**
 * Server-side guard para paginas de un rol especifico (HU-002).
 * Redirige a /auth/login si no hay sesion, o a /auth/error si el rol
 * autenticado no esta en la lista permitida. El administrador siempre
 * puede entrar a cualquier panel ademas del suyo.
 */
export async function requireRole(
  allowedRoles: string[],
): Promise<UserProfile> {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/auth/login");
  }

  const codigoRol = profile.roles?.[0]?.codigo;
  const puedeAcceder =
    codigoRol === "administrador" ||
    (codigoRol ? allowedRoles.includes(codigoRol) : false);

  if (!puedeAcceder) {
    redirect("/auth/error?error=No+tenes+permiso+para+acceder+a+esta+seccion");
  }

  return profile;
}
