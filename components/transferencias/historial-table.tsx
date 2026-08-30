import type { Transferencia } from "@/lib/transferencias/actions";

const ESTADO_LABEL: Record<string, string> = {
  pendiente_aprobacion: "Pendiente de aprobación",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  en_transito: "En tránsito",
  completada: "Completada",
};

export function HistorialTable({
  transferencias,
  depositoId,
}: {
  transferencias: Transferencia[];
  depositoId: string;
}) {
  if (transferencias.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Este depósito todavía no tiene transferencias registradas.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="p-3">Producto</th>
            <th className="p-3">Cantidad</th>
            <th className="p-3">Dirección</th>
            <th className="p-3">Contraparte</th>
            <th className="p-3">Estado</th>
            <th className="p-3">Motivo rechazo</th>
            <th className="p-3">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {transferencias.map((t) => {
            const esOrigen = t.deposito_origen_id === depositoId;
            return (
              <tr key={t.id} className="border-t">
                <td className="p-3 font-medium">{t.productos?.nombre ?? "—"}</td>
                <td className="p-3">{t.cantidad}</td>
                <td className="p-3">{esOrigen ? "Sale" : "Entra"}</td>
                <td className="p-3">
                  {esOrigen ? t.destino?.nombre ?? "—" : t.origen?.nombre ?? "—"}
                </td>
                <td className="p-3">{ESTADO_LABEL[t.estado] ?? t.estado}</td>
                <td className="p-3 text-muted-foreground">{t.motivo_rechazo ?? "—"}</td>
                <td className="p-3 text-muted-foreground">
                  {new Date(t.created_at).toLocaleString("es-AR")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
