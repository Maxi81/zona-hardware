"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { ProductoLite } from "@/lib/movimientos/actions";
import type { Deposito } from "@/lib/productos/actions";

const TIPOS_FILTRO = [
  { value: "INGRESO", label: "Ingreso (compra)" },
  { value: "AJUSTE_POSITIVO", label: "Ajuste (+)" },
  { value: "AJUSTE_NEGATIVO", label: "Ajuste (-)" },
  { value: "EGRESO_OTRO", label: "Egreso (otro)" },
  { value: "EGRESO_VENTA", label: "Egreso (venta)" },
  { value: "TRANSFERENCIA_ENTRADA", label: "Transferencia (entrada)" },
  { value: "TRANSFERENCIA_SALIDA", label: "Transferencia (salida)" },
];

export function MovimientosFiltros({
  productos,
  depositos,
}: {
  productos: ProductoLite[];
  depositos: Deposito[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [depositoId, setDepositoId] = useState(searchParams.get("deposito_id") ?? "");
  const [productoId, setProductoId] = useState(searchParams.get("producto_id") ?? "");
  const [tipo, setTipo] = useState(searchParams.get("tipo") ?? "");
  const [desde, setDesde] = useState(searchParams.get("desde") ?? "");
  const [hasta, setHasta] = useState(searchParams.get("hasta") ?? "");

  function aplicar() {
    const params = new URLSearchParams();
    if (depositoId) params.set("deposito_id", depositoId);
    if (productoId) params.set("producto_id", productoId);
    if (tipo) params.set("tipo", tipo);
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    router.push(`${pathname}?${params.toString()}`);
  }

  function limpiar() {
    setDepositoId("");
    setProductoId("");
    setTipo("");
    setDesde("");
    setHasta("");
    router.push(pathname);
  }

  const hayFiltros = depositoId || productoId || tipo || desde || hasta;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
        <div>
          <Label className="text-xs text-slate-500">Producto</Label>
          <Select value={productoId} onChange={(e) => setProductoId(e.target.value)}>
            <option value="">Todos</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label className="text-xs text-slate-500">Tipo</Label>
          <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos</option>
            {TIPOS_FILTRO.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label className="text-xs text-slate-500">Desde</Label>
          <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-slate-500">Hasta</Label>
          <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
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
