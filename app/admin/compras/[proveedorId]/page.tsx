import { requireRole } from "@/lib/auth/guards";
import { getCuentaCorriente } from "@/lib/compras/actions";
import { getProveedores } from "@/lib/proveedores/actions";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function CuentaCorrientePage({
  params,
}: {
  params: Promise<{ proveedorId: string }>;
}) {
  await requireRole(["administrador"]);
  const { proveedorId } = await params;

  const [movimientos, proveedores] = await Promise.all([
    getCuentaCorriente(proveedorId),
    getProveedores(),
  ]);

  const proveedor = proveedores.find((p) => p.id === proveedorId);
  if (!proveedor) {
    return <div>Proveedor no encontrado</div>;
  }

  let saldoAcumulado = 0;

  function formatMonto(monto: number) {
    return monto.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/compras?tab=pagos"
          className="rounded-md p-2 hover:bg-slate-100 text-slate-500"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Cuenta Corriente - {proveedor.nombre}
          </h1>
          <p className="text-sm text-slate-500">Historial de comprobantes y pagos</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Detalle</th>
              <th className="px-4 py-3 font-medium text-right">Debe</th>
              <th className="px-4 py-3 font-medium text-right">Haber</th>
              <th className="px-4 py-3 font-medium text-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No hay movimientos registrados
                </td>
              </tr>
            ) : (
              movimientos.map((m, i) => {
                saldoAcumulado += (m.monto_debe - m.monto_haber);
                return (
                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {formatDate(m.fecha)}
                    </td>
                    <td className="px-4 py-3 text-slate-900 font-medium">
                      {m.detalle}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-900">
                      {m.monto_debe > 0 ? formatMonto(m.monto_debe) : ""}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-green-600">
                      {m.monto_haber > 0 ? formatMonto(m.monto_haber) : ""}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-semibold text-slate-900">
                      {formatMonto(saldoAcumulado)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
