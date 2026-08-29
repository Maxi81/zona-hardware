import { requireRole } from "@/lib/auth/guards";

export default async function VentasPage() {
  await requireRole(["vendedor"]);
  return <h1>Bienvenido al panel de Vendedor</h1>;
}
