import { requireRole } from "@/lib/auth/guards";

export default async function GerenciaPage() {
  await requireRole(["gerente"]);
  return <h1>Bienvenido al panel de Gerente</h1>;
}
