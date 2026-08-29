"use client";

import {
  aprobarSolicitud,
  rechazarSolicitud,
  type SolicitudRevendedor,
} from "@/lib/revendedores/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function SolicitudesPendientesTable({
  solicitudes,
}: {
  solicitudes: SolicitudRevendedor[];
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  if (solicitudes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay solicitudes de revendedor pendientes.
      </p>
    );
  }

  const handleAprobar = async (id: string) => {
    setPendingId(id);
    setError(null);
    const result = await aprobarSolicitud(id);
    if (result.error) setError(result.error);
    setPendingId(null);
  };

  const handleRechazar = async (id: string) => {
    const motivo = (motivos[id] ?? "").trim();
    if (!motivo) {
      setError("Escribí un motivo de rechazo antes de rechazar la solicitud");
      return;
    }
    setPendingId(id);
    setError(null);
    const result = await rechazarSolicitud(id, motivo);
    if (result.error) setError(result.error);
    setPendingId(null);
  };

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Usuario</th>
              <th className="p-3">CUIT</th>
              <th className="p-3">Motivo de rechazo</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {solicitudes.map((s) => (
              <tr key={s.id} className="border-t align-top">
                <td className="p-3 font-medium">
                  {s.usuarios?.nombre} {s.usuarios?.apellido}
                </td>
                <td className="p-3">{s.cuit}</td>
                <td className="p-3 w-64">
                  <Input
                    placeholder="Motivo (solo si vas a rechazar)"
                    value={motivos[s.id] ?? ""}
                    onChange={(e) =>
                      setMotivos((m) => ({ ...m, [s.id]: e.target.value }))
                    }
                  />
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={pendingId === s.id}
                      onClick={() => handleAprobar(s.id)}
                    >
                      Aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pendingId === s.id}
                      onClick={() => handleRechazar(s.id)}
                    >
                      Rechazar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
