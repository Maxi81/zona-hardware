"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowDown, ArrowUp, ArrowLeftRight } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  registrarIngreso,
  registrarEgreso,
  registrarTransferencia,
  buscarDepositosConStock,
  type ProductoLite,
  type DepositoConStock,
} from "@/lib/movimientos/actions";
import type { Deposito } from "@/lib/productos/actions";

type TipoAlto = "ingreso" | "egreso" | "transferencia";

const TIPOS: { value: TipoAlto; label: string; icon: typeof ArrowDown }[] = [
  { value: "ingreso", label: "Ingreso", icon: ArrowDown },
  { value: "egreso", label: "Egreso", icon: ArrowUp },
  { value: "transferencia", label: "Transferencia", icon: ArrowLeftRight },
];

export function NuevoMovimientoBoton({
  productos,
  depositos,
}: {
  productos: ProductoLite[];
  depositos: Deposito[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<TipoAlto>("ingreso");

  function cerrar() {
    setOpen(false);
    setTipo("ingreso");
  }

  function alExito() {
    cerrar();
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        Nuevo movimiento
      </Button>

      <Dialog open={open} onClose={cerrar} title="Nuevo movimiento de stock">
        <div className="mb-4 grid grid-cols-3 gap-2">
          {TIPOS.map((t) => {
            const Icon = t.icon;
            const activo = tipo === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTipo(t.value)}
                className={`flex flex-col items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  activo
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {tipo === "ingreso" && (
          <FormIngreso productos={productos} depositos={depositos} onExito={alExito} />
        )}
        {tipo === "egreso" && (
          <FormEgreso productos={productos} depositos={depositos} onExito={alExito} />
        )}
        {tipo === "transferencia" && (
          <FormTransferencia productos={productos} depositos={depositos} onExito={alExito} />
        )}
      </Dialog>
    </>
  );
}

function FormIngreso({
  productos,
  depositos,
  onExito,
}: {
  productos: ProductoLite[];
  depositos: Deposito[];
  onExito: () => void;
}) {
  const [motivo, setMotivo] = useState<"compra" | "ajuste">("compra");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await registrarIngreso(formData);
    setLoading(false);
    if (result.error) setError(result.error);
    else onExito();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <input type="hidden" name="motivo_ingreso" value={motivo} />
      <div className="grid gap-2">
        <Label htmlFor="ing_motivo">Motivo</Label>
        <Select
          id="ing_motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value as "compra" | "ajuste")}
        >
          <option value="compra">Compra a proveedor</option>
          <option value="ajuste">Ajuste de inventario (suma stock)</option>
        </Select>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="ing_deposito">Depósito</Label>
          <Select id="ing_deposito" name="deposito_id" required defaultValue="">
            <option value="" disabled>
              Elegí un depósito
            </option>
            {depositos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ing_producto">Producto</Label>
          <Select id="ing_producto" name="producto_id" required defaultValue="">
            <option value="" disabled>
              Elegí un producto
            </option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} ({p.sku})
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ing_cantidad">Cantidad</Label>
        <Input id="ing_cantidad" name="cantidad" type="number" min="1" step="1" required />
      </div>
      {motivo === "compra" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="ing_proveedor">Proveedor</Label>
            <Input id="ing_proveedor" name="proveedor" placeholder="Ej: Distribuidora Sur" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ing_oc">Orden de compra</Label>
            <Input id="ing_oc" name="orden_compra" placeholder="Ej: OC-2044" />
          </div>
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor="ing_detalle">
          Detalle {motivo === "ajuste" ? "(obligatorio)" : "(opcional)"}
        </Label>
        <Input
          id="ing_detalle"
          name="detalle"
          required={motivo === "ajuste"}
          placeholder={
            motivo === "ajuste" ? "Ej: conteo físico encontró 5 unidades más" : "Referencia libre"
          }
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" disabled={loading} className="w-fit">
        {loading ? "Registrando..." : "Registrar ingreso"}
      </Button>
    </form>
  );
}

function FormEgreso({
  productos,
  depositos,
  onExito,
}: {
  productos: ProductoLite[];
  depositos: Deposito[];
  onExito: () => void;
}) {
  const [motivo, setMotivo] = useState<"ajuste" | "otro">("ajuste");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await registrarEgreso(formData);
    setLoading(false);
    if (result.error) setError(result.error);
    else onExito();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <input type="hidden" name="motivo_egreso" value={motivo} />
      <div className="grid gap-2">
        <Label htmlFor="egr_motivo">Motivo</Label>
        <Select
          id="egr_motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value as "ajuste" | "otro")}
        >
          <option value="ajuste">Ajuste de inventario (resta stock)</option>
          <option value="otro">Otra razón</option>
        </Select>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="egr_deposito">Depósito</Label>
          <Select id="egr_deposito" name="deposito_id" required defaultValue="">
            <option value="" disabled>
              Elegí un depósito
            </option>
            {depositos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="egr_producto">Producto</Label>
          <Select id="egr_producto" name="producto_id" required defaultValue="">
            <option value="" disabled>
              Elegí un producto
            </option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} ({p.sku})
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="egr_cantidad">Cantidad</Label>
        <Input id="egr_cantidad" name="cantidad" type="number" min="1" step="1" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="egr_detalle">
          Detalle {motivo === "ajuste" ? "(obligatorio)" : "(opcional)"}
        </Label>
        <Input
          id="egr_detalle"
          name="detalle"
          required={motivo === "ajuste"}
          placeholder={
            motivo === "ajuste" ? "Ej: rotura de 2 unidades en depósito" : "Referencia libre"
          }
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" disabled={loading} className="w-fit">
        {loading ? "Registrando..." : "Registrar egreso"}
      </Button>
    </form>
  );
}

function FormTransferencia({
  productos,
  depositos,
  onExito,
}: {
  productos: ProductoLite[];
  depositos: Deposito[];
  onExito: () => void;
}) {
  const [productoId, setProductoId] = useState("");
  const [depositoDestinoId, setDepositoDestinoId] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<DepositoConStock[] | null>(null);
  const [depositoOrigenId, setDepositoOrigenId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [detalle, setDetalle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function buscar() {
    if (!productoId || !depositoDestinoId) {
      setError("Elegí primero el producto y el depósito de destino");
      return;
    }
    setError(null);
    setBuscando(true);
    setResultados(null);
    setDepositoOrigenId("");
    const data = await buscarDepositosConStock(productoId, depositoDestinoId);
    setResultados(data);
    setBuscando(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!depositoOrigenId) {
      setError("Elegí de qué depósito viene la transferencia");
      return;
    }
    setError(null);
    setLoading(true);
    const formData = new FormData();
    formData.set("producto_id", productoId);
    formData.set("deposito_origen_id", depositoOrigenId);
    formData.set("deposito_destino_id", depositoDestinoId);
    formData.set("cantidad", cantidad);
    formData.set("detalle", detalle);
    const result = await registrarTransferencia(formData);
    setLoading(false);
    if (result.error) setError(result.error);
    else onExito();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="tr_producto">Producto</Label>
          <Select
            id="tr_producto"
            required
            value={productoId}
            onChange={(e) => {
              setProductoId(e.target.value);
              setResultados(null);
              setDepositoOrigenId("");
            }}
          >
            <option value="" disabled>
              Elegí un producto
            </option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} ({p.sku})
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="tr_destino">Depósito destino</Label>
          <Select
            id="tr_destino"
            required
            value={depositoDestinoId}
            onChange={(e) => {
              setDepositoDestinoId(e.target.value);
              setResultados(null);
              setDepositoOrigenId("");
            }}
          >
            <option value="" disabled>
              Elegí un depósito
            </option>
            {depositos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={buscar}
        disabled={buscando || !productoId || !depositoDestinoId}
        className="w-fit"
      >
        {buscando ? "Buscando..." : "Buscar depósitos con stock"}
      </Button>

      {resultados && resultados.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Ningún otro depósito de la red tiene stock disponible de este producto en este momento.
        </p>
      )}

      {resultados && resultados.length > 0 && (
        <div className="grid gap-2">
          <Label>Depósito de origen</Label>
          <div className="flex flex-col gap-1">
            {resultados.map((r) => (
              <label
                key={r.deposito_id}
                className={`flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-sm ${
                  depositoOrigenId === r.deposito_id
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-border"
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="tr_origen_radio"
                    checked={depositoOrigenId === r.deposito_id}
                    onChange={() => setDepositoOrigenId(r.deposito_id)}
                  />
                  {r.deposito_nombre}
                </span>
                <span className="text-muted-foreground">{r.cantidad_disponible} disponibles</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {depositoOrigenId && (
        <>
          <div className="grid gap-2">
            <Label htmlFor="tr_cantidad">Cantidad a transferir</Label>
            <Input
              id="tr_cantidad"
              type="number"
              min="1"
              step="1"
              required
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tr_detalle">Detalle (opcional)</Label>
            <Input
              id="tr_detalle"
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              placeholder="Referencia libre"
            />
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {depositoOrigenId && (
        <Button type="submit" disabled={loading} className="w-fit">
          {loading ? "Transfiriendo..." : "Registrar transferencia"}
        </Button>
      )}
    </form>
  );
}
