import { requireRole } from "@/lib/auth/guards";

export default async function CatalogoMayoristaPage() {
  await requireRole(["revendedor"]);
  return <h1>Bienvenido al panel de Revendedor</h1>;
}
