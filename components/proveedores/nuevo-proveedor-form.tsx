"use client";

import { useRef, useState } from "react";
import { crearProveedor } from "@/lib/proveedores/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NuevoProveedorForm() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);

    const result = await crearProveedor(formData);
    if (result.error) {
      setError(result.error);
    } else {
      formRef.current?.reset();
    }
    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Nuevo proveedor</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={handleSubmit} className="grid gap-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" name="nombre" required placeholder="Distribuidora Sur SRL" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cuit">CUIT</Label>
              <Input id="cuit" name="cuit" placeholder="30-12345678-9" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="ventas@proveedor.com" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input id="telefono" name="telefono" placeholder="0387 123-4567" />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input id="direccion" name="direccion" />
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={isLoading} className="w-fit">
            {isLoading ? "Creando..." : "Crear proveedor"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
