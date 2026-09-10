"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Deposito } from "@/lib/productos/actions";
import type { Proveedor } from "@/lib/proveedores/actions";

const ESTADOS = [
  { value: "borrador", label: "Borrador" },
  { value: "emitida", label: "Emitida" },
  { value: "recibida", label: "Recibida" },
  { value: "cancelada", label: "Cancelada" },
];

export function ComprasFiltros({
  proveedores,
  depositos,
}: {
  proveedores: Proveedor[];
  depositos: Deposito[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [estado, setEstado] = useState(searchParams.get("estado") ?? "");
  const [proveedorId, setProveedorId] = useState(searchParams.get("proveedor_id") ?? "");
  const [depositoId, setDepositoId] = useState(searchParams.get("deposito_id") ?? "");

  function aplicar() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("estado");
    params.delete("proveedor_id");
    params.delete("deposito_id");
    if (estado) params.set("estado", estado);
    if (proveedorId) params.set("proveedor_id", proveedorId);
    if (depositoId) params.set("deposito_id", depositoId);
    router.push(`${pathname}?${params.toString()}`);
  }

  function limpiar() {
    setEstado("");
    setProveedorId("");
    setDepositoId("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("estado");
    params.delete("proveedor_id");
    params.delete("deposito_id");
    router.push(`${pathname}?${params.toString()}`);
  }

  const hayFiltros = estado || proveedorId || depositoId;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label className="text-xs text-slate-500">Estado</Label>
          <Select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos</option>
            {ESTADOS.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label className="text-xs text-slate-500">Proveedor</Label>
          <Select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
            <option value="">Todos</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label className="text-xs text-slate-500">Depósito</Label>
          <Select value={depositoId} onChange={(e) => setDepositoId(e.target.value)}>
            <option value="">Todos</option>
            {depositos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button type="button" size="sm" onClick={aplicar}>
          Filtrar
        </Button>
        {hayFiltros && (
          <Button type="button" size="sm" variant="ghost" onClick={limpiar}>
            Limpiar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
