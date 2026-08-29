"use client";

import { darBajaSucursal, type Sucursal } from "@/lib/sucursales/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function SucursalesTable({ sucursales }: { sucursales: Sucursal[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBaja = async (id: string) => {
    setPendingId(id);
    setError(null);
    const result = await darBajaSucursal(id);
    if (result.error) setError(result.error);
    setPendingId(null);
  };

  if (sucursales.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay sucursales cargadas.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Sucursal</th>
              <th className="p-3">Ubicación</th>
              <th className="p-3">Depósito</th>
              <th className="p-3">Estado</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {sucursales.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3 font-medium">{s.nombre}</td>
                <td className="p-3 text-muted-foreground">
                  {[s.direccion, s.ciudad, s.provincia]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </td>
                <td className="p-3">{s.depositos?.nombre ?? "—"}</td>
                <td className="p-3">
                  <Badge
                    variant={s.estado === "activa" ? "default" : "secondary"}
                  >
                    {s.estado}
                  </Badge>
                </td>
                <td className="p-3 text-right">
                  {s.estado === "activa" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pendingId === s.id}
                      onClick={() => handleBaja(s.id)}
                    >
                      {pendingId === s.id ? "..." : "Dar de baja"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
