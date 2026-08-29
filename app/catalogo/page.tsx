import { requireRole } from "@/lib/auth/guards";

export default async function CatalogoPage() {
  await requireRole(["cliente"]);
  return <h1>Bienvenido al panel de Cliente</h1>;
}
