"use client";

import { solicitarTransferencia } from "@/lib/transferencias/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useState } from "react";
import type { DepositoConStock } from "@/lib/transferencias/actions";

export function SolicitarTransferenciaForm({
  productoId,
  productoNombre,
  depositoDestinoId,
  resultados,
}: {
  productoId: string;
  productoNombre: string;
  depositoDestinoId: string;
  resultados: DepositoConStock[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    const result = await solicitarTransferencia(formData);
    if (result.error) setError(result.error);
    else setSuccess(true);
    setLoading(false);
  };

  if (resultados.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Ningún otro depósito de la red tiene stock disponible de{" "}
        <span className="font-medium">{productoNombre}</span> en este momento.
      </p>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          Solicitar transferencia de {productoNombre}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="grid gap-4 max-w-xl md:grid-cols-3 md:items-end">
          <input type="hidden" name="producto_id" value={productoId} />
          <input type="hidden" name="deposito_destino_id" value={depositoDestinoId} />
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="deposito_origen_id">Depósito con stock</Label>
            <Select id="deposito_origen_id" name="deposito_origen_id" required defaultValue="">
              <option value="" disabled>
                Elegí de dónde pedir
              </option>
              {resultados.map((r) => (
                <option key={r.deposito_id} value={r.deposito_id}>
                  {r.deposito_nombre} ({r.cantidad_disponible} disponibles)
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cantidad">Cantidad</Label>
            <Input id="cantidad" name="cantidad" type="number" min="1" step="1" required />
          </div>
          {error && <p className="text-sm text-red-500 md:col-span-3">{error}</p>}
          {success && (
            <p className="text-sm text-muted-foreground md:col-span-3">
              Transferencia solicitada correctamente. Queda pendiente de aprobación del
              depósito de origen.
            </p>
          )}
          <Button type="submit" disabled={loading} className="w-fit">
            {loading ? "Solicitando..." : "Solicitar transferencia"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
