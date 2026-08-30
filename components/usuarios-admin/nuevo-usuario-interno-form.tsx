"use client";

import { crearUsuarioInterno } from "@/lib/usuarios-admin/actions";
import { ROLES_INTERNOS, ROLES_LABELS } from "@/lib/usuarios-admin/roles";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useRef, useState } from "react";

export function NuevoUsuarioInternoForm() {
  const [error, setError] = useState<string | null>(null);
  const [creado, setCreado] = useState<{
    email: string;
    passwordTemporal: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);
    setCreado(null);

    const result = await crearUsuarioInterno(formData);
    if (result.error) {
      setError(result.error);
    } else {
      formRef.current?.reset();
      if (result.email && result.passwordTemporal) {
        setCreado({
          email: result.email,
          passwordTemporal: result.passwordTemporal,
        });
      }
    }
    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Nuevo usuario interno</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={handleSubmit} className="grid gap-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" name="nombre" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="apellido">Apellido</Label>
              <Input id="apellido" name="apellido" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rol">Rol</Label>
              <Select id="rol" name="rol" required defaultValue="">
                <option value="" disabled>
                  Elegí un rol
                </option>
                {ROLES_INTERNOS.map((codigo) => (
                  <option key={codigo} value={codigo}>
                    {ROLES_LABELS[codigo]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          {creado && (
            <p className="rounded-md border border-green-600/30 bg-green-600/10 p-3 text-sm">
              Usuario creado: <strong>{creado.email}</strong>
              <br />
              Contraseña temporal (compartila con el empleado, no queda
              guardada en ningún lado):{" "}
              <code className="font-mono">{creado.passwordTemporal}</code>
            </p>
          )}
          <Button type="submit" disabled={isLoading} className="w-fit">
            {isLoading ? "Creando..." : "Crear usuario"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
