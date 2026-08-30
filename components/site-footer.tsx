import Link from "next/link";
import { Cpu } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-secondary/20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md gradient-accent text-white">
              <Cpu className="h-4 w-4" />
            </span>
            <span className="font-display text-base font-bold tracking-tight">
              Zona<span className="text-primary">Hardware</span>
            </span>
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            Catálogo, depósitos y ventas de la red de sucursales en un solo
            sistema.
          </p>
        </div>
        <div className="flex flex-wrap gap-10 text-sm">
          <div className="flex flex-col gap-2">
            <span className="font-medium text-foreground">Acceso</span>
            <Link href="/auth/login" className="text-muted-foreground hover:text-foreground">
              Iniciar sesión
            </Link>
            <Link href="/auth/sign-up" className="text-muted-foreground hover:text-foreground">
              Crear cuenta
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-border/70 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} ZonaHardware · Proyecto académico Sistemas III, UCASAL
      </div>
    </footer>
  );
}
