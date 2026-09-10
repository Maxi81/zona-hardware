"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cambiarEstadoProveedor, type Proveedor } from "@/lib/proveedores/actions";

export function ProveedoresTable({ proveedores }: { proveedores: Proveedor[] }) {
  const router = useRouter();
  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleEstado(proveedor: Proveedor) {
    setError(null);
    setCargando(proveedor.id);
    const nuevoEstado = proveedor.estado === "activo" ? "inactivo" : "activo";
    const result = await cambiarEstadoProveedor(proveedor.id, nuevoEstado);
    setCargando(null);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  if (proveedores.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Todavía no hay proveedores cargados.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">CUIT</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Teléfono</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {proveedores.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-900">{p.nombre}</td>
                <td className="px-4 py-3 text-slate-500">{p.cuit ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500">{p.email ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500">{p.telefono ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                      p.estado === "activo"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {p.estado === "activo" ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={cargando === p.id}
                    onClick={() => toggleEstado(p)}
                  >
                    {cargando === p.id
                      ? "Guardando..."
                      : p.estado === "activo"
                        ? "Desactivar"
                        : "Activar"}
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
