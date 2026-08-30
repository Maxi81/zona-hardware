import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Deposito } from "@/lib/productos/actions";

export function DepositoSelector({
  depositos,
  depositoId,
}: {
  depositos: Deposito[];
  depositoId?: string;
}) {
  if (depositos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay depósitos cargados. Dados de alta desde Sucursales y
        depósitos.
      </p>
    );
  }

  return (
    <form action="/deposito" method="get" className="flex flex-wrap items-end gap-4">
      <div className="grid gap-2">
        <Label htmlFor="deposito_id">Depósito</Label>
        <Select id="deposito_id" name="deposito_id" defaultValue={depositoId ?? ""} required>
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
      <Button type="submit">Ver depósito</Button>
    </form>
  );
}
