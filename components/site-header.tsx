import Link from "next/link";
import { Cpu, Search, User } from "lucide-react";
import { getCurrentUserProfile } from "@/lib/auth/actions";
import { getCategorias } from "@/lib/productos/actions";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";
import { ROL_LABELS, catalogoPathParaRol } from "@/lib/site/roles";

export async function SiteHeader() {
  const profile = await getCurrentUserProfile();
  const codigoRol = profile?.roles?.[0]?.codigo;
  const esClienteORevendedor = codigoRol === "cliente" || codigoRol === "revendedor";
  const catalogoPath = catalogoPathParaRol(codigoRol);
  const categorias = esClienteORevendedor ? await getCategorias() : [];

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg gradient-accent text-white">
            <Cpu className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            Zona<span className="text-primary">Hardware</span>
          </span>
        </Link>

        {esClienteORevendedor && (
          <form
            action={catalogoPath}
            method="get"
            className="hidden flex-1 max-w-md items-center gap-2 rounded-full border border-input bg-secondary/50 px-3 py-1.5 md:flex"
          >
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              name="q"
              placeholder="Buscar por nombre, SKU o especificación…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </form>
        )}

        <div className="ml-auto flex items-center gap-3">
          {profile ? (
            <>
              <span className="hidden text-right leading-tight sm:block">
                <span className="block text-sm font-medium">{profile.nombre}</span>
                <span className="block text-xs text-muted-foreground">
                  {ROL_LABELS[codigoRol ?? ""] ?? codigoRol}
                </span>
              </span>
              <Link
                href="/perfil"
                aria-label="Mi perfil"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
              >
                <User className="h-4 w-4" />
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/auth/login">Iniciar sesión</Link>
              </Button>
              <Button asChild size="sm" className="gradient-accent text-white hover:opacity-90">
                <Link href="/auth/sign-up">Registrarme</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {esClienteORevendedor && (
        <div className="border-t border-border/70 bg-secondary/30">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-2 overflow-x-auto px-4 py-2 text-sm sm:px-6">
            <Link
              href="/"
              className="shrink-0 rounded-full px-3 py-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Inicio
            </Link>
            <Link
              href={catalogoPath}
              className="shrink-0 rounded-full bg-primary px-3 py-1 font-medium text-primary-foreground"
            >
              {codigoRol === "revendedor" ? "Catálogo mayorista" : "Catálogo"}
            </Link>
            {categorias.slice(0, 6).map((c) => (
              <Link
                key={c.id}
                href={`${catalogoPath}?categoria_id=${c.id}`}
                className="shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {c.nombre}
              </Link>
            ))}
            <span className="ml-auto hidden shrink-0 text-xs text-muted-foreground sm:block">
              {categorias.length} categorías · Panel {ROL_LABELS[codigoRol ?? ""] ?? ""}
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
