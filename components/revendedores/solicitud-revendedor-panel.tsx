"use client";

import { solicitarAltaRevendedor, type SolicitudRevendedor } from "@/lib/revendedores/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente de aprobación",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

export function SolicitudRevendedorPanel({
  solicitud,
}: {
  solicitud: SolicitudRevendedor | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [enviada, setEnviada] = useState(false);

  const puedeSolicitar =
    !solicitud || solicitud.estado === "rechazada";

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);
    const result = await solicitarAltaRevendedor(formData);
    if (result.error) setError(result.error);
    else setEnviada(true);
    setIsLoading(false);
  };

  if (solicitud && !enviada) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tu solicitud de revendedor</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">CUIT {solicitud.cuit}</span>
            <Badge
              variant={
                solicitud.estado === "aprobada"
                  ? "default"
                  : solicitud.estado === "rechazada"
                    ? "destructive"
                    : "secondary"
              }
            >
              {ESTADO_LABEL[solicitud.estado]}
            </Badge>
          </div>
          {solicitud.estado === "rechazada" && solicitud.motivo_rechazo && (
            <p className="text-sm text-red-500">
              Motivo: {solicitud.motivo_rechazo}
            </p>
          )}
          {solicitud.estado === "aprobada" && (
            <p className="text-sm text-muted-foreground">
              Ya tenés acceso a precios y condiciones mayoristas. Iniciá sesión de
              nuevo para ver el catálogo de revendedor.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!puedeSolicitar) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Solicitar alta como revendedor</CardTitle>
      </CardHeader>
      <CardContent>
        {enviada ? (
          <p className="text-sm text-muted-foreground">
            Tu solicitud quedó pendiente de aprobación por un administrador.
          </p>
        ) : (
          <form action={handleSubmit} className="grid gap-4">
            <div className="grid gap-2 max-w-xs">
              <Label htmlFor="cuit">CUIT</Label>
              <Input id="cuit" name="cuit" required placeholder="20-12345678-9" />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={isLoading} className="w-fit">
              {isLoading ? "Enviando..." : "Enviar solicitud"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
