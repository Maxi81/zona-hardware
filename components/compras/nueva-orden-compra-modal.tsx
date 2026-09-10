"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { crearOrdenCompra, type ItemOrdenCompra } from "@/lib/compras/actions";
import type { ProductoLite } from "@/lib/movimientos/actions";
import type { Deposito } from "@/lib/productos/actions";
import type { Proveedor } from "@/lib/proveedores/actions";

type ItemForm = {
  producto_id: string;
  cantidad_pedida: string;
  precio_unitario: string;
};

const ITEM_VACIO: ItemForm = { producto_id: "", cantidad_pedida: "1", precio_unitario: "" };

export function NuevaOrdenCompraBoton({
  proveedores,
  depositos,
  productos,
}: {
  proveedores: Proveedor[];
  depositos: Deposito[];
  productos: ProductoLite[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [proveedorId, setProveedorId] = useState("");
  const [depositoId, setDepositoId] = useState("");
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState<ItemForm[]>([{ ...ITEM_VACIO }]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const proveedoresActivos = proveedores.filter((p) => p.estado === "activo");

  function cerrar() {
    setOpen(false);
    setProveedorId("");
    setDepositoId("");
    setNotas("");
    setItems([{ ...ITEM_VACIO }]);
    setError(null);
  }

  function actualizarItem(index: number, campo: keyof ItemForm, valor: string) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [campo]: valor } : item)));
  }

  function agregarItem() {
    setItems((prev) => [...prev, { ...ITEM_VACIO }]);
  }

  function quitarItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!proveedorId || !depositoId) {
      setError("Elegí un proveedor y un depósito");
      return;
    }

    const itemsPayload: ItemOrdenCompra[] = [];
    for (const item of items) {
      if (!item.producto_id) continue;
      const cantidad = Number(item.cantidad_pedida);
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        setError("Cada ítem necesita una cantidad entera mayor a 0");
        return;
      }
      const precio = item.precio_unitario.trim() ? Number(item.precio_unitario) : null;
      if (precio !== null && (Number.isNaN(precio) || precio < 0)) {
        setError("El precio unitario tiene que ser un número válido");
        return;
      }
      itemsPayload.push({
        producto_id: item.producto_id,
        cantidad_pedida: cantidad,
        precio_unitario: precio,
      });
    }

    if (!itemsPayload.length) {
      setError("Agregá al menos un ítem con producto y cantidad");
      return;
    }

    setLoading(true);
    const result = await crearOrdenCompra(
      proveedorId,
      depositoId,
      itemsPayload,
      notas.trim() || null,
    );
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      cerrar();
      router.refresh();
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        Nueva orden de compra
      </Button>

      <Dialog open={open} onClose={cerrar} title="Nueva orden de compra">
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="oc_proveedor">Proveedor</Label>
              <Select
                id="oc_proveedor"
                value={proveedorId}
                onChange={(e) => setProveedorId(e.target.value)}
                required
              >
                <option value="" disabled>
                  Elegí un proveedor
                </option>
                {proveedoresActivos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="oc_deposito">Depósito</Label>
              <Select
                id="oc_deposito"
                value={depositoId}
                onChange={(e) => setDepositoId(e.target.value)}
                required
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

          <div className="grid gap-2">
            <Label>Ítems</Label>
            <div className="flex flex-col gap-2">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[1fr_80px_110px_auto] items-center gap-2"
                >
                  <Select
                    value={item.producto_id}
                    onChange={(e) => actualizarItem(index, "producto_id", e.target.value)}
                  >
                    <option value="">Producto</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({p.sku})
                      </option>
                    ))}
                  </Select>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Cant."
                    value={item.cantidad_pedida}
                    onChange={(e) => actualizarItem(index, "cantidad_pedida", e.target.value)}
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Precio unit."
                    value={item.precio_unitario}
                    onChange={(e) => actualizarItem(index, "precio_unitario", e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => quitarItem(index)}
                    disabled={items.length === 1}
                    aria-label="Quitar ítem"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={agregarItem}
              className="w-fit gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar ítem
            </Button>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="oc_notas">Notas (opcional)</Label>
            <Input id="oc_notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={loading} className="w-fit">
            {loading ? "Creando..." : "Crear orden de compra"}
          </Button>
        </form>
      </Dialog>
    </>
  );
}
