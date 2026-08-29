"use client";

import { cambiarEstadoUsuario, type UsuarioAdmin } from "@/lib/usuarios-admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function UsuariosTable({ usuarios }: { usuarios: UsuarioAdmin[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const handleCambiarEstado = async (
    id: string,
    estadoActual: "activo" | "inactivo",
  ) => {
    const motivo = (motivos[id] ?? "").trim();
    if (!motivo) {
      setError("Escribí un motivo antes de activar o desactivar la cuenta");
      return;
    }
    setPendingId(id);
    setError(null);
    const nuevoEstado = estadoActual === "activo" ? "inactivo" : "activo";
    const result = await cambiarEstadoUsuario(id, nuevoEstado, motivo);
    if (result.error) setError(result.error);
    else setMotivos((m) => ({ ...m, [id]: "" }));
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
              <th className="p-3">Email</th>
              <th className="p-3">Rol</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Motivo del cambio</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-t align-top">
                <td className="p-3 font-medium">
                  {u.nombre} {u.apellido}
                </td>
                <td className="p-3 text-muted-foreground">{u.email ?? "—"}</td>
                <td className="p-3">{u.roles?.[0]?.codigo ?? "—"}</td>
                <td className="p-3">
                  <Badge variant={u.estado === "activo" ? "default" : "secondary"}>
                    {u.estado}
                  </Badge>
                </td>
                <td className="p-3 w-64">
                  <Input
                    placeholder="Motivo"
                    value={motivos[u.id] ?? ""}
                    onChange={(e) =>
                      setMotivos((m) => ({ ...m, [u.id]: e.target.value }))
                    }
                  />
                </td>
                <td className="p-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pendingId === u.id}
                    onClick={() => handleCambiarEstado(u.id, u.estado)}
                  >
                    {u.estado === "activo" ? "Desactivar" : "Reactivar"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
