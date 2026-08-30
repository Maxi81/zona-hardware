// Constantes de UI para roles de ZonaHardware, compartidas entre el header,
// la landing y los paneles. Sin "use server": estas son solo constantes, y
// un archivo "use server" solo puede exportar funciones async (ver el bug
// documentado en la migracion del HU-002 sobre lib/usuarios-admin/roles.ts).

export const ROL_LABELS: Record<string, string> = {
  cliente: "Cliente",
  revendedor: "Revendedor",
  vendedor: "Ventas",
  encargado_deposito: "Depósito",
  gerente: "Gerencia",
  administrador: "Administrador",
};

// A donde va cada rol despues de iniciar sesion (debe reflejar
// lib/auth/actions.ts -> signIn -> destinations).
export const ROL_HOME: Record<string, string> = {
  cliente: "/catalogo",
  revendedor: "/catalogo-mayorista",
  vendedor: "/ventas",
  encargado_deposito: "/deposito",
  gerente: "/gerencia",
  administrador: "/admin",
};

export const ROL_DESCRIPCIONES: Record<string, string> = {
  cliente: "Compra al público, precios de lista y catálogo con stock en tiempo real.",
  revendedor: "Precios mayoristas cuando están cargados y el mismo catálogo consolidado.",
  vendedor: "Atiende ventas en sucursal con visibilidad de stock disponible.",
  encargado_deposito: "Ingresos, egresos y transferencias del depósito a su cargo.",
  gerente: "Seguimiento de sucursales, depósitos y operación de su zona.",
  administrador: "Alta de usuarios, catálogo, sucursales y control total del sistema.",
};

export function catalogoPathParaRol(codigoRol: string | undefined): string {
  return codigoRol === "revendedor" ? "/catalogo-mayorista" : "/catalogo";
}
