"use client";

import {
  agregarDireccion,
  eliminarDireccion,
  marcarDireccionPrincipal,
  type Direccion,
} from "@/lib/perfil/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRef, useState } from "react";

export function DireccionesPanel({
  direcciones,
}: {
  direcciones: Direccion[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleAgregar = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);
    const result = await agregarDireccion(formData);
    if (result.error) setError(result.error);
    else formRef.current?.reset();
    setIsLoading(false);
  };

  const handleEliminar = async (id: string) => {
    setPendingId(id);
    setError(null);
    const result = await eliminarDireccion(id);
    if (result.error) setError(result.error);
    setPendingId(null);
  };

  const handlePrincipal = async (id: string) => {
    setPendingId(id);
    setError(null);
    const result = await marcarDireccionPrincipal(id);
    if (result.error) setError(result.error);
    setPendingId(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Direcciones</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {error && <p className="text-sm text-red-500">{error}</p>}

        {direcciones.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no cargaste ninguna dirección.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {direcciones.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-md border p-3 text-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {d.calle} {d.numero ?? ""}
                    </span>
                    {d.principal && <Badge>Principal</Badge>}
                  </div>
                  <span className="text-muted-foreground">
                    {[d.ciudad, d.provincia, d.codigo_postal]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
                <div className="flex gap-2">
                  {!d.principal && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pendingId === d.id}
                      onClick={() => handlePrincipal(d.id)}
                    >
                      Marcar principal
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pendingId === d.id}
                    onClick={() => handleEliminar(d.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form
          ref={formRef}
          action={handleAgregar}
          className="grid gap-4 border-t pt-4 sm:grid-cols-2"
        >
          <div className="grid gap-2">
            <Label htmlFor="calle">Calle</Label>
            <Input id="calle" name="calle" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="numero">Número</Label>
            <Input id="numero" name="numero" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ciudad">Ciudad</Label>
            <Input id="ciudad" name="ciudad" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="provincia">Provincia</Label>
            <Input id="provincia" name="provincia" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="codigo_postal">Código postal</Label>
            <Input id="codigo_postal" name="codigo_postal" />
          </div>
          <div className="flex items-end gap-2">
            <input type="checkbox" id="principal" name="principal" className="h-4 w-4" />
            <Label htmlFor="principal">Usar como principal</Label>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={isLoading} className="w-fit">
              {isLoading ? "Agregando..." : "Agregar dirección"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
