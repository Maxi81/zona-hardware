import { requireRole } from "@/lib/auth/guards";

export default async function DepositoPage() {
  await requireRole(["encargado_deposito"]);
  return <h1>Bienvenido al panel de Encargado de Depósito</h1>;
}
