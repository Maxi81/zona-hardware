"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getComprobantesPendientes, crearOrdenPago, type DeudaProveedor, type ComprobantePendiente } from "@/lib/compras/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

function formatMonto(monto: number) {
  return monto.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-AR");
}

export function PagosProveedoresPanel({ deudas }: { deudas: DeudaProveedor[] }) {
  const router = useRouter();
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<DeudaProveedor | null>(null);
  const [comprobantes, setComprobantes] = useState<ComprobantePendiente[]>([]);
  const [cargandoComprobantes, setCargandoComprobantes] = useState(false);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function abrirModalPago(proveedor: DeudaProveedor) {
    setProveedorSeleccionado(proveedor);
    setSeleccionados([]);
    setError(null);
    setCargandoComprobantes(true);
    const result = await getComprobantesPendientes(proveedor.proveedor_id);
    setComprobantes(result);
    setCargandoComprobantes(false);
  }

  function cerrarModal() {
    setProveedorSeleccionado(null);
    setComprobantes([]);
  }

  function toggle(id: string) {
    setSeleccionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function pagar() {
    if (!seleccionados.length) {
      setError("Selecciona al menos un comprobante");
      return;
    }
    setError(null);
    setLoading(true);
    const result = await crearOrdenPago(proveedorSeleccionado!.proveedor_id, seleccionados);
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      cerrarModal();
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
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3 font-medium">Proveedor</th>
              <th className="px-4 py-3 font-medium text-right">Recibido</th>
              <th className="px-4 py-3 font-medium text-right">Pagado</th>
              <th className="px-4 py-3 font-medium text-right">Deuda</th>
              <th className="px-4 py-3 font-medium text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {deudas.map((d) => (
              <tr key={d.proveedor_id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 text-slate-900 font-medium">
                  {d.proveedor_nombre}
                  <div className="text-xs text-indigo-600 mt-1 cursor-pointer hover:underline" onClick={() => router.push(`/admin/compras/${d.proveedor_id}`)}>
                    Ver Cuenta Corriente
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-500">
                  {formatMonto(d.monto_recibido)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-500">
                  {formatMonto(d.monto_pagado)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-medium text-slate-900">
                  {formatMonto(d.deuda)}
                </td>
                <td className="px-4 py-3 text-center">
                  <Button size="sm" onClick={() => abrirModalPago(d)}>Pagar Comprobantes</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!proveedorSeleccionado} onOpenChange={(open) => !open && cerrarModal()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Pagar comprobantes - {proveedorSeleccionado?.proveedor_nombre}</DialogTitle>
          </DialogHeader>
          {cargandoComprobantes ? (
            <div className="py-8 text-center text-sm text-slate-500">Cargando comprobantes pendientes...</div>
          ) : (
            <div className="flex flex-col gap-4 py-4">
              {comprobantes.length === 0 ? (
                <p className="text-sm text-slate-500">No hay comprobantes pendientes para pagar.</p>
              ) : (
                <div className="max-h-[300px] overflow-y-auto rounded-md border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 w-10"></th>
                        <th className="px-3 py-2">Comprobante</th>
                        <th className="px-3 py-2">Fecha</th>
                        <th className="px-3 py-2 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comprobantes.map(c => (
                        <tr key={c.id} className="border-t">
                          <td className="px-3 py-2">
                            <input 
                              type="checkbox" 
                              checked={seleccionados.includes(c.id)}
                              onChange={() => toggle(c.id)}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <span className="uppercase text-xs font-semibold tracking-wider text-slate-500 mr-2">{c.tipo.replace('_', ' ')}</span>
                            {c.numero}
                            {c.orden_compra_numero && <div className="text-xs text-slate-400 mt-1">Ref OC: {c.orden_compra_numero}</div>}
                          </td>
                          <td className="px-3 py-2 text-slate-500">{formatDate(c.fecha_emision)}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium {c.tipo === 'nota_credito' ? 'text-green-600' : 'text-slate-900'}">
                            {c.tipo === 'nota_credito' ? '-' : ''}{formatMonto(c.monto_total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={cerrarModal}>Cancelar</Button>
            <Button disabled={loading || !seleccionados.length} onClick={pagar}>
              {loading ? "Registrando..." : "Registrar Orden de Pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
