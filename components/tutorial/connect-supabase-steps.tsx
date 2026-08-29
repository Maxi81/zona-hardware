import { TutorialStep } from "./tutorial-step";

export function ConnectSupabaseSteps() {
  return (
    <ol className="flex flex-col gap-6">
      <TutorialStep title="Crea un proyecto de Supabase">
        <p>
          Ve a{" "}
          <a
            href="https://app.supabase.com/project/_/settings/api"
            target="_blank"
            className="font-bold hover:underline text-foreground/80"
            rel="noreferrer"
          >
            database.new
          </a>{" "}
          y crea un nuevo proyecto de Supabase.
        </p>
      </TutorialStep>

      <TutorialStep title="Declara las variables de entorno">
        <p>
          Renombra el archivo{" "}
          <span className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xs font-medium text-secondary-foreground border">
            .env.example
          </span>{" "}
          de tu app de Next.js a{" "}
          <span className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xs font-medium text-secondary-foreground border">
            .env.local
          </span>{" "}
          y completa los valores desde la{" "}
          <a
            href="https://app.supabase.com/project/_/settings/api"
            target="_blank"
            className="font-bold hover:underline text-foreground/80"
            rel="noreferrer"
          >
            configuración de API de tu proyecto de Supabase
          </a>
          .
        </p>
      </TutorialStep>

      <TutorialStep title="Reinicia el servidor de desarrollo de Next.js">
        <p>
          Puede que tengas que cerrar tu servidor de desarrollo de Next.js y ejecutar{" "}
          <span className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xs font-medium text-secondary-foreground border">
            npm run dev
          </span>{" "}
          otra vez para cargar las nuevas variables de entorno.
        </p>
      </TutorialStep>

      <TutorialStep title="Refresca la página">
        <p>
          Es posible que tengas que recargar la página para que Next.js cargue
          las nuevas variables de entorno.
        </p>
      </TutorialStep>
    </ol>
  );
}
