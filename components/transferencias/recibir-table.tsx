"use client";

import { confirmarRecepcionTransferencia } from "@/lib/transferencias/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Transferencia } from "@/lib/transferencias/actions";
import { useState } from "react";

function FilaEnTransito({ t }: { t: Transferencia }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    const result = await confirmarRecepcionTransferencia(formData);
    if (result.error) setError(result.error);
    else setSuccess(true);
    setLoading(false);
  };

  return (
    <tr className="border-t align-top">
      <td className="p-3 font-medium">{t.productos?.nombre ?? "—"}</td>
      <td className="p-3">{t.cantidad}</td>
      <td className="p-3">{t.origen?.nombre ?? "—"}</td>
      <td className="p-3">
        {success ? (
          <p className="text-xs text-muted-foreground">Recepción confirmada.</p>
        ) : (
          <form action={handleSubmit} className="flex items-center gap-2">
            <input type="hidden" name="transferencia_id" value={t.id} />
            <Input
              name="cantidad_recibida"
              type="number"
              min="1"
              step="1"
              placeholder={`${t.cantidad}`}
              required
              className="h-8 w-24"
            />
            <Button size="sm" type="submit" disabled={loading}>
              Confirmar recepción
            </Button>
          </form>
        )}
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </td>
    </tr>
  );
}

export function RecibirTable({ transferencias }: { transferencias: Transferencia[] }) {
  if (transferencias.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay transferencias en tránsito hacia este depósito.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="p-3">Producto</th>
            <th className="p-3">Cantidad despachada</th>
            <th className="p-3">Viene de</th>
            <th className="p-3">Confirmar recepción</th>
          </tr>
        </thead>
        <tbody>
          {transferencias.map((t) => (
            <FilaEnTransito key={t.id} t={t} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
