import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth/actions";
import { getMisDirecciones } from "@/lib/perfil/actions";
import { DatosPersonalesForm } from "@/components/perfil/datos-personales-form";
import { DireccionesPanel } from "@/components/perfil/direcciones-panel";

export default async function PerfilPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/auth/login");

  const direcciones = await getMisDirecciones();

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Mi perfil</h1>
      <DatosPersonalesForm nombre={profile.nombre} apellido={profile.apellido} />
      <DireccionesPanel direcciones={direcciones} />
    </div>
  );
}
