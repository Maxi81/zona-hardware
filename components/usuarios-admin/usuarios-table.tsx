"use client";

import {
  cambiarEstadoUsuario,
  cambiarRolUsuario,
  type UsuarioAdmin,
} from "@/lib/usuarios-admin/actions";
import { ROLES_LABELS } from "@/lib/usuarios-admin/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useState } from "react";

export function UsuariosTable({ usuarios }: { usuarios: UsuarioAdmin[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [rolesSeleccionados, setRolesSeleccionados] = useState<
    Record<string, string>
  >({});
  const [pendingRolId, setPendingRolId] = useState<string | null>(null);
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

  const handleCambiarRol = async (id: string, rolActual: string) => {
    const rolElegido = rolesSeleccionados[id] ?? rolActual;
    if (rolElegido === rolActual) return;
    setPendingRolId(id);
    setError(null);
    const result = await cambiarRolUsuario(id, rolElegido);
    if (result.error) setError(result.error);
    setPendingRolId(null);
  };

  if (usuarios.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay usuarios cargados.
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
              <th className="p-3">Usuario</th>
              <th className="p-3">Email</th>
              <th className="p-3">Rol</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Motivo del cambio</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const rolActual = u.roles?.[0]?.codigo ?? "";
              return (
                <tr key={u.id} className="border-t align-top">
                  <td className="p-3 font-medium">
                    {u.nombre} {u.apellido}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {u.email ?? "—"}
                  </td>
                  <td className="p-3 w-48">
                    <div className="flex items-center gap-2">
                      <Select
                        value={rolesSeleccionados[u.id] ?? rolActual}
                        onChange={(e) =>
                          setRolesSeleccionados((r) => ({
                            ...r,
                            [u.id]: e.target.value,
                          }))
                        }
                      >
                        {Object.entries(ROLES_LABELS).map(
                          ([codigo, etiqueta]) => (
                            <option key={codigo} value={codigo}>
                              {etiqueta}
                            </option>
                          ),
                        )}
                      </Select>
                      {(rolesSeleccionados[u.id] ?? rolActual) !==
                        rolActual && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pendingRolId === u.id}
                          onClick={() => handleCambiarRol(u.id, rolActual)}
                        >
                          {pendingRolId === u.id ? "..." : "Guardar"}
                        </Button>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge
                      variant={u.estado === "activo" ? "default" : "secondary"}
                    >
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
