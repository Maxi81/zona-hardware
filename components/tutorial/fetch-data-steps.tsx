import { TutorialStep } from "./tutorial-step";
import { CodeBlock } from "./code-block";

const create = `create table notes (
  id bigserial primary key,
  title text
);

insert into notes(title)
values
  ('Today I created a Supabase project.'),
  ('I added some data and queried it from Next.js.'),
  ('It was awesome!');
`.trim();

const rls = `alter table notes enable row level security;
create policy "Allow public read access" on notes
for select
using (true);`.trim();

const server = `import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = await createClient()
  const { data: notes } = await supabase.from('notes').select()

  return <pre>{JSON.stringify(notes, null, 2)}</pre>
}
`.trim();

const client = `'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function Page() {
  const [notes, setNotes] = useState<any[] | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const { data } = await supabase.from('notes').select()
      setNotes(data)
    }
    getData()
  }, [])

  return <pre>{JSON.stringify(notes, null, 2)}</pre>
}
`.trim();

export function FetchDataSteps() {
  return (
    <ol className="flex flex-col gap-6">
      <TutorialStep title="Crea tablas e inserta algunos datos">
        <p>
          Ve al{" "}
          <a
            href="https://supabase.com/dashboard/project/_/editor"
            className="font-bold hover:underline text-foreground/80"
            target="_blank"
            rel="noreferrer"
          >
            Editor de tablas
          </a>{" "}
          de tu proyecto de Supabase para crear una tabla e insertar algunos
          datos de ejemplo. Si no se te ocurre nada, puedes copiar y pegar lo
          siguiente en el{" "}
          <a
            href="https://supabase.com/dashboard/project/_/sql/new"
            className="font-bold hover:underline text-foreground/80"
            target="_blank"
            rel="noreferrer"
          >
            Editor SQL
          </a>{" "}
          y hacer clic en EJECUTAR.
        </p>
        <CodeBlock code={create} />
      </TutorialStep>

      <TutorialStep title="Habilita Row Level Security (RLS)">
        <p>
          Supabase activa Row Level Security (RLS) por defecto. Para consultar
          datos de tu tabla <code>notes</code>, necesitas añadir una política.
          Puedes hacerlo en el{" "}
          <a
            href="https://supabase.com/dashboard/project/_/editor"
            className="font-bold hover:underline text-foreground/80"
            target="_blank"
            rel="noreferrer"
          >
            Editor de tablas
          </a>{" "}
          o a través del{" "}
          <a
            href="https://supabase.com/dashboard/project/_/sql/new"
            className="font-bold hover:underline text-foreground/80"
            target="_blank"
            rel="noreferrer"
          >
            Editor SQL
          </a>
          .
        </p>
        <p>
          Por ejemplo, puedes ejecutar este SQL para permitir acceso de lectura
          público:
        </p>
        <CodeBlock code={rls} />
        <p>
          Puedes aprender más sobre RLS en la{" "}
          <a
            href="https://supabase.com/docs/guides/auth/row-level-security"
            className="font-bold hover:underline text-foreground/80"
            target="_blank"
            rel="noreferrer"
          >
            documentación de Supabase
          </a>
          .
        </p>
      </TutorialStep>

      <TutorialStep title="Consulta datos de Supabase desde Next.js">
        <p>
          Para crear un cliente de Supabase y consultar datos desde un
          componente servidor asíncrono, crea un archivo page.tsx en{" "}
          <span className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xs font-medium text-secondary-foreground border">
            /app/notes/page.tsx
          </span>{" "}
          y agrega lo siguiente.
        </p>
        <CodeBlock code={server} />
        <p>Alternativamente, puedes usar un componente cliente.</p>
        <CodeBlock code={client} />
      </TutorialStep>

      <TutorialStep title="Explora la biblioteca de UI de Supabase">
        <p>
          Ve a la{" "}
          <a
            href="https://supabase.com/ui"
            className="font-bold hover:underline text-foreground/80"
          >
            biblioteca de UI de Supabase
          </a>{" "}
          e intenta instalar algunos bloques. Por ejemplo, puedes instalar un
          bloque de chat en tiempo real ejecutando:
        </p>
        <CodeBlock
          code={
            "npx shadcn@latest add https://supabase.com/ui/r/realtime-chat-nextjs.json"
          }
        />
      </TutorialStep>

      <TutorialStep title="Construye en un fin de semana y escala a millones!">
        <p>¡Ya estás listo para lanzar tu producto al mundo! 🚀</p>
      </TutorialStep>
    </ol>
  );
}
