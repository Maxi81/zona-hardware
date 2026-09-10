"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { registrarPagoProveedores, type DeudaProveedor } from "@/lib/compras/actions";

function formatMonto(monto: number) {
  return monto.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

export function PagosProveedoresPanel({ deudas }: { deudas: DeudaProveedor[] }) {
  const router = useRouter();
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggle(id: string) {
    setSeleccionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function seleccionarTodos() {
    setSeleccionados(deudas.map((d) => d.proveedor_id));
  }

  function limpiarSeleccion() {
    setSeleccionados([]);
  }

  async function pagar() {
    if (!seleccionados.length) {
      setError("Seleccioná al menos un proveedor");
      return;
    }
    setError(null);
    setLoading(true);
    const result = await registrarPagoProveedores(seleccionados);
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      setSeleccionados([]);
      router.refresh();
    }
  }

  if (deudas.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        No hay deuda pendiente con proveedores.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={seleccionarTodos}>
          Seleccionar todos
        </Button>
        {seleccionados.length > 0 && (
          <Button type="button" size="sm" variant="ghost" onClick={limpiarSeleccion}>
            Limpiar selección
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          disabled={loading || !seleccionados.length}
          onClick={pagar}
          className="ml-auto"
        >
          {loading ? "Registrando..." : `Pagar seleccionados (${seleccionados.length})`}
        </Button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3 font-medium"></th>
              <th className="px-4 py-3 font-medium">Proveedor</th>
              <th className="px-4 py-3 font-medium text-right">Recibido</th>
              <th className="px-4 py-3 font-medium text-right">Pagado</th>
              <th className="px-4 py-3 font-medium text-right">Deuda</th>
            </tr>
          </thead>
          <tbody>
            {deudas.map((d) => (
              <tr key={d.proveedor_id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={seleccionados.includes(d.proveedor_id)}
                    onChange={() => toggle(d.proveedor_id)}
                  />
                </td>
                <td className="px-4 py-3 text-slate-900">{d.proveedor_nombre}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-500">
                  {formatMonto(d.monto_recibido)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-500">
                  {formatMonto(d.monto_pagado)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-medium text-slate-900">
                  {formatMonto(d.deuda)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
