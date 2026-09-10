"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { emitirOrdenCompra, registrarRemito, type OrdenCompra } from "@/lib/compras/actions";
import { formatearNumeroOC } from "@/lib/compras/format";

const ESTADO_INFO: Record<string, { label: string; className: string }> = {
  borrador: { label: "Borrador", className: "bg-slate-100 text-slate-700" },
  emitida: { label: "Emitida", className: "bg-amber-50 text-amber-700" },
  recibida: { label: "Recibida", className: "bg-emerald-50 text-emerald-700" },
  cancelada: { label: "Cancelada", className: "bg-rose-50 text-rose-700" },
};

function formatFecha(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatMonto(monto: number) {
  return monto.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

export function OrdenesCompraTabla({
  ordenes,
  puedeGestionar,
  puedeCargarRemito,
}: {
  ordenes: OrdenCompra[];
  puedeGestionar: boolean;
  puedeCargarRemito: boolean;
}) {
  const router = useRouter();
  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function emitir(id: string) {
    setError(null);
    setCargando(id);
    const result = await emitirOrdenCompra(id);
    setCargando(null);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  async function cargarRemito(id: string) {
    setError(null);
    setCargando(id);
    const result = await registrarRemito(id);
    setCargando(null);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  if (ordenes.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        No hay órdenes de compra que coincidan con los filtros seleccionados.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3 font-medium">N°</th>
              <th className="px-4 py-3 font-medium">Proveedor</th>
              <th className="px-4 py-3 font-medium">Depósito</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Ítems</th>
              <th className="px-4 py-3 font-medium text-right">Total</th>
              <th className="px-4 py-3 font-medium">Creada</th>
              <th className="px-4 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ordenes.map((oc) => {
              const info = ESTADO_INFO[oc.estado] ?? {
                label: oc.estado,
                className: "bg-slate-100 text-slate-700",
              };
              return (
                <tr key={oc.id} className="border-b border-slate-100 last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                    {formatearNumeroOC(oc.numero)}
                  </td>
                  <td className="px-4 py-3 text-slate-900">{oc.proveedor_nombre}</td>
                  <td className="px-4 py-3 text-slate-500">{oc.deposito_nombre}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${info.className}`}
                    >
                      {info.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{oc.cantidad_items}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-900">
                    {formatMonto(oc.monto_total)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {formatFecha(oc.fecha_creacion)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {oc.estado === "borrador" && puedeGestionar && (
                      <Button size="sm" disabled={cargando === oc.id} onClick={() => emitir(oc.id)}>
                        {cargando === oc.id ? "Emitiendo..." : "Emitir"}
                      </Button>
                    )}
                    {oc.estado === "emitida" && puedeCargarRemito && (
                      <Button
                        size="sm"
                        disabled={cargando === oc.id}
                        onClick={() => cargarRemito(oc.id)}
                      >
                        {cargando === oc.id ? "Cargando..." : "Cargar remito"}
                      </Button>
                    )}
                    {((oc.estado === "borrador" && !puedeGestionar) ||
                      (oc.estado === "emitida" && !puedeCargarRemito) ||
                      oc.estado === "recibida" ||
                      oc.estado === "cancelada") && <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
