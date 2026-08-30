// Constantes de roles compartidas entre actions.ts ("use server", solo puede
// exportar funciones async) y los componentes de UI. Separado en su propio
// archivo por eso: un archivo "use server" no puede exportar objetos/arrays.

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
