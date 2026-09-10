import { requireRole } from "@/lib/auth/guards";
import { ROLES_INTERNOS_TODOS } from "@/lib/site/roles";
import { getDashboardMetrics } from "@/lib/admin/dashboard";
import {
  Boxes,
  PackageCheck,
  ArrowLeftRight,
  Activity,
  Users,
  UserPlus,
  ClipboardList,
} from "lucide-react";

const TILE_STYLES = {
  indigo: { bg: "bg-indigo-50", icon: "text-indigo-600" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600" },
  amber: { bg: "bg-amber-50", icon: "text-amber-600" },
  sky: { bg: "bg-sky-50", icon: "text-sky-600" },
  violet: { bg: "bg-violet-50", icon: "text-violet-600" },
  rose: { bg: "bg-rose-50", icon: "text-rose-600" },
  teal: { bg: "bg-teal-50", icon: "text-teal-600" },
} as const;

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  color: keyof typeof TILE_STYLES;
}) {
  const style = TILE_STYLES[color];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${style.bg}`}>
          <Icon className={`h-[18px] w-[18px] ${style.icon}`} />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-900">
        {value.toLocaleString("es-AR")}
      </p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  );
}

export default async function AdminPage() {
  await requireRole([...ROLES_INTERNOS_TODOS]);
  const metrics = await getDashboardMetrics();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Resumen del estado actual de la red: stock, catálogo, transferencias
          y usuarios.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile
          label="Stock total"
          value={metrics.stockTotalUnidades}
          hint="Unidades en toda la red de depósitos"
          icon={Boxes}
          color="indigo"
        />
        <StatTile
          label="Productos publicados"
          value={metrics.productosPublicados}
          hint="Visibles en el catálogo"
          icon={PackageCheck}
          color="emerald"
        />
        <StatTile
          label="Transferencias hoy"
          value={metrics.transferenciasHoy}
          hint="Transferencias entre depósitos del día"
          icon={ArrowLeftRight}
          color="sky"
        />
        <StatTile
          label="Movimientos hoy"
          value={metrics.movimientosHoy}
          hint="Ingresos y egresos de stock del día"
          icon={Activity}
          color="amber"
        />
        <StatTile
          label="Usuarios activos"
          value={metrics.usuariosActivos}
          hint="Cuentas habilitadas para operar"
          icon={Users}
          color="violet"
        />
        <StatTile
          label="Solicitudes de revendedor"
          value={metrics.solicitudesRevendedorPendientes}
          hint="Pendientes de revisión"
          icon={UserPlus}
          color="rose"
        />
        <StatTile
          label="Órdenes de compra pendientes"
          value={metrics.ordenesCompraPendientes}
          hint="En borrador o emitidas, sin remito recibido"
          icon={ClipboardList}
          color="teal"
        />
      </div>
    </div>
  );
}
