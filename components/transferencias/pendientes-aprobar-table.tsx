"use client";

import { resolverTransferencia } from "@/lib/transferencias/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Transferencia } from "@/lib/transferencias/actions";
import { useState } from "react";

function FilaPendiente({ t }: { t: Transferencia }) {
  const [motivo, setMotivo] = useState("");
  const [mostrarRechazo, setMostrarRechazo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const aprobar = async () => {
    setLoading(true);
    setError(null);
    const result = await resolverTransferencia(t.id, true);
    if (result.error) setError(result.error);
    setLoading(false);
  };

  const rechazar = async () => {
    if (!motivo.trim()) {
      setError("El motivo del rechazo es obligatorio");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await resolverTransferencia(t.id, false, motivo);
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
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button size="sm" disabled={loading} onClick={aprobar}>
              Aprobar
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={() => setMostrarRechazo((v) => !v)}
            >
              Rechazar
            </Button>
          </div>
          {mostrarRechazo && (
            <div className="flex gap-2">
              <Input
                placeholder="Motivo del rechazo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="h-8"
              />
              <Button size="sm" variant="destructive" disabled={loading} onClick={rechazar}>
                Confirmar rechazo
              </Button>
            </div>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      </td>
    </tr>
  );
}

export function PendientesAprobarTable({
  transferencias,
}: {
  transferencias: Transferencia[];
}) {
  if (transferencias.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay solicitudes de transferencia pendientes de aprobación desde este depósito.
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
            <th className="p-3">Lo pide</th>
            <th className="p-3">Fecha</th>
            <th className="p-3">Acción</th>
          </tr>
        </thead>
        <tbody>
          {transferencias.map((t) => (
            <FilaPendiente key={t.id} t={t} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
