"use client";

import { actualizarDatosPersonales } from "@/lib/perfil/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export function DatosPersonalesForm({
  nombre,
  apellido,
}: {
  nombre: string;
  apellido: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);
    setGuardado(false);
    const result = await actualizarDatosPersonales(formData);
    if (result.error) setError(result.error);
    else setGuardado(true);
    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Datos personales</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" name="nombre" defaultValue={nombre} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="apellido">Apellido</Label>
            <Input id="apellido" name="apellido" defaultValue={apellido} required />
          </div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <Button type="submit" disabled={isLoading} className="w-fit">
              {isLoading ? "Guardando..." : "Guardar cambios"}
            </Button>
            {guardado && (
              <span className="text-sm text-muted-foreground">Guardado.</span>
            )}
            {error && <span className="text-sm text-red-500">{error}</span>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
