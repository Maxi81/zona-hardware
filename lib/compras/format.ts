// Formateo de numero de OC ("OC-0001"), compartido entre server actions y
// componentes. Sin "use server": un archivo "use server" solo puede
// exportar funciones async (bug ya documentado en el proyecto, HU-002 sobre
// lib/usuarios-admin/roles.ts) -- esta es una funcion sincrona pura.

export function formatearNumeroOC(numero: number): string {
  return `OC-${String(numero).padStart(4, "0")}`;
}
