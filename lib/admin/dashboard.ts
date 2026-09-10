"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserProfile } from "@/lib/auth/actions";
import { esRolInterno } from "@/lib/site/roles";

export type DashboardMetrics = {
  stockTotalUnidades: number;
  productosPublicados: number;
  transferenciasHoy: number;
  movimientosHoy: number;
  usuariosActivos: number;
  solicitudesRevendedorPendientes: number;
};

const METRICS_VACIAS: DashboardMetrics = {
  stockTotalUnidades: 0,
  productosPublicados: 0,
  transferenciasHoy: 0,
  movimientosHoy: 0,
  usuariosActivos: 0,
  solicitudesRevendedorPendientes: 0,
};

// Reportes esenciales del panel unificado (05/09/2026): solo metricas de
// modulos que existen de verdad hoy (Catalogo, Stock, Transferencias,
// Identidad/Revendedores) - nada de ingresos/egresos ni ordenes de compra,
// porque Ventas y Compras todavia no estan construidos.
//
// (10/09/2026) transferenciasEnCurso paso a transferenciasHoy: desde que las
// transferencias son atomicas (sin flujo de aprobacion, ver migracion
// 20260910000000_movimientos_stock_unificado.sql) ya no existe el estado
// 'pendiente_aprobacion'/'en_transito', asi que ese conteo siempre daba 0.
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const profile = await getCurrentUserProfile();
  if (!esRolInterno(profile?.roles?.[0]?.codigo)) return METRICS_VACIAS;

  const supabase = await createClient();

  const [stockRes, productosRes, transferenciasRes, movimientosRes, solicitudesRes] =
    await Promise.all([
      supabase.rpc("stock_consolidado_detalle"),
      supabase
        .from("productos")
        .select("id", { count: "exact", head: true })
        .eq("estado", "publicado"),
      supabase
        .from("transferencias_stock")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      supabase
        .from("movimientos_stock")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      supabase
        .from("solicitudes_revendedor")
        .select("id", { count: "exact", head: true })
        .eq("estado", "pendiente"),
    ]);

  const stockTotalUnidades = (
    (stockRes.data ?? []) as { cantidad_total: number }[]
  ).reduce((acc, row) => acc + Number(row.cantidad_total), 0);

  // usuarios activos: la tabla usuarios tiene RLS self-only, hace falta el
  // cliente con service role (mismo patron que getUsuariosAdmin).
  let usuariosActivos = 0;
  try {
    const admin = createAdminClient();
    const { count } = await admin
      .from("usuarios")
      .select("id", { count: "exact", head: true })
      .eq("estado", "activo");
    usuariosActivos = count ?? 0;
  } catch (error) {
    console.error("Error al contar usuarios activos:", error);
  }

  return {
    stockTotalUnidades,
    productosPublicados: productosRes.count ?? 0,
    transferenciasHoy: transferenciasRes.count ?? 0,
    movimientosHoy: movimientosRes.count ?? 0,
    usuariosActivos,
    solicitudesRevendedorPendientes: solicitudesRes.count ?? 0,
  };
}
