"use client";

import { despacharTransferencia } from "@/lib/transferencias/actions";
import { Button } from "@/components/ui/button";
import type { Transferencia } from "@/lib/transferencias/actions";
import { useState } from "react";

function FilaAprobada({ t }: { t: Transferencia }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const despachar = async () => {
    setLoading(true);
    setError(null);
    const result = await despacharTransferencia(t.id);
    if (result.error) setError(result.error);
    setLoading(false);
  };

  return (
    <tr className="border-t align-top">
      <td className="p-3 font-medium">{t.productos?.nombre ?? "—"}</td>
      <td className="p-3">{t.cantidad}</td>
      <td className="p-3">{t.destino?.nombre ?? "—"}</td>
      <td className="p-3 text-muted-foreground">
        {new Date(t.created_at).toLocaleString("es-AR")}
      </td>
      <td className="p-3">
        <Button size="sm" disabled={loading} onClick={despachar}>
          Despachar
        </Button>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </td>
    </tr>
  );
}

export function DespacharTable({ transferencias }: { transferencias: Transferencia[] }) {
  if (transferencias.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay transferencias aprobadas esperando despacho desde este depósito.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="p-3">Producto</th>
            <th className="p-3">Cantidad</th>
            <th className="p-3">Va para</th>
            <th className="p-3">Fecha de solicitud</th>
            <th className="p-3">Acción</th>
          </tr>
        </thead>
        <tbody>
          {transferencias.map((t) => (
            <FilaAprobada key={t.id} t={t} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
