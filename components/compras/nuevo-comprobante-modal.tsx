"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { crearComprobante } from "@/lib/compras/actions";
import type { Proveedor } from "@/lib/proveedores/actions";
import type { OrdenCompra } from "@/lib/compras/actions";

export function NuevoComprobanteBoton({ proveedores, ordenes }: { proveedores: Proveedor[], ordenes: OrdenCompra[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Cargar Comprobante</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Comprobante de Proveedor</DialogTitle>
        </DialogHeader>
        <FormComprobante 
          proveedores={proveedores} 
          ordenes={ordenes}
          onExito={() => setOpen(false)} 
        />
      </DialogContent>
    </Dialog>
  );
}

function FormComprobante({
  proveedores,
  ordenes,
  onExito,
}: {
  proveedores: Proveedor[];
  ordenes: OrdenCompra[];
  onExito: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [proveedorId, setProveedorId] = useState("");

  const ordenesProveedor = ordenes.filter(o => o.proveedor_id === proveedorId && (o.estado === 'recibida' || o.estado === 'emitida'));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await crearComprobante(formData);
    
    setLoading(false);
    
    if (result.error) {
      setError(result.error);
    } else {
      onExito();
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="proveedor_id">Proveedor</Label>
        <Select id="proveedor_id" name="proveedor_id" required value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
          <option value="" disabled>Seleccioná un proveedor</option>
          {proveedores.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </Select>
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="tipo">Tipo de Comprobante</Label>
        <Select id="tipo" name="tipo" required defaultValue="factura">
          <option value="factura">Factura</option>
          <option value="nota_debito">Nota de Débito</option>
          <option value="nota_credito">Nota de Crédito</option>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="numero">Número (Ej: 0001-00001234)</Label>
        <Input id="numero" name="numero" required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="fecha_emision">Fecha de Emisión</Label>
          <Input id="fecha_emision" name="fecha_emision" type="date" required />
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="monto_total">Monto Total</Label>
          <Input id="monto_total" name="monto_total" type="number" step="0.01" min="0.01" required />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="orden_compra_id">Orden de Compra (Opcional)</Label>
        <Select id="orden_compra_id" name="orden_compra_id" defaultValue="" disabled={!proveedorId}>
          <option value="">Ninguna</option>
          {ordenesProveedor.map((o) => (
            <option key={o.id} value={o.id}>
              OC-{String(o.numero).padStart(4, '0')} - {new Date(o.fecha_creacion).toLocaleDateString("es-AR")}
            </option>
          ))}
        </Select>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      
      <Button type="submit" disabled={loading} className="mt-2">
        {loading ? "Guardando..." : "Guardar Comprobante"}
      </Button>
    </form>
  );
}
