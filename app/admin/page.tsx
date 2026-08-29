import { requireRole } from "@/lib/auth/guards";

export default async function AdminPage() {
  await requireRole(["administrador"]);
  return <h1>Bienvenido al panel de Administrador</h1>;
}
