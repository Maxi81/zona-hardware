import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  ClipboardList,
  Layers,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Users,
} from "lucide-react";
import { getCurrentUserProfile } from "@/lib/auth/actions";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { ROL_DESCRIPCIONES, ROL_HOME, ROL_LABELS } from "@/lib/site/roles";

const MODULOS = [
  {
    icon: Users,
    titulo: "Identidad y accesos",
    texto:
      "Alta de usuarios internos, roles por sucursal y aprobación de cuentas de revendedor.",
  },
  {
    icon: Boxes,
    titulo: "Sucursales y depósitos",
    texto: "Red de sucursales con su depósito asociado, alta y baja con control de stock.",
  },
  {
    icon: ShoppingBag,
    titulo: "Catálogo y precios",
    texto:
      "Precio de lista y precio mayorista por producto, con búsqueda por especificaciones.",
  },
  {
    icon: ClipboardList,
    titulo: "Stock y movimientos",
    texto: "Ingresos, egresos y stock consolidado por depósito en tiempo real.",
  },
  {
    icon: Truck,
    titulo: "Transferencias entre depósitos",
    texto:
      "Solicitud, aprobación, despacho y recepción de mercadería entre depósitos de la red.",
  },
];

const ROLES = ["cliente", "revendedor", "vendedor", "encargado_deposito", "gerente", "administrador"];

export default async function Home() {
  const profile = await getCurrentUserProfile();
  const codigoRol = profile?.roles?.[0]?.codigo;
  const destino = codigoRol ? ROL_HOME[codigoRol] : undefined;

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border/70">
          <div className="pointer-events-none absolute inset-0 -z-10 gradient-accent opacity-[0.06]" />
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-20 sm:px-6 md:py-28">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Placas de video · Procesadores · Memorias · Gabinetes
            </span>
            <h1 className="max-w-3xl text-balance font-display text-4xl font-bold leading-[1.05] sm:text-5xl md:text-6xl">
              Componentes de PC, con el stock real{" "}
              <span className="gradient-accent-text">de toda la red.</span>
            </h1>
            <p className="max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
              ZonaHardware conecta el catálogo con el depósito de cada
              sucursal: precio de lista para clientes, precio mayorista para
              revendedores, y transferencias con aprobación cuando una
              sucursal se queda sin stock y otra sí tiene.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              {destino ? (
                <Button asChild size="lg" className="gradient-accent text-white hover:opacity-90">
                  <Link href={destino}>
                    Ir a mi panel
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg" className="gradient-accent text-white hover:opacity-90">
                    <Link href="/auth/login">
                      Iniciar sesión
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/auth/sign-up">Crear cuenta</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="border-b border-border/70 bg-secondary/20">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-none border-y border-border/70 bg-border/70 sm:px-0 md:grid-cols-4">
            {[
              { icon: ShoppingBag, texto: "Catálogo con precios B2C y B2B" },
              { icon: Layers, texto: "Stock consolidado por depósito" },
              { icon: Truck, texto: "Transferencias con aprobación" },
              { icon: ShieldCheck, texto: "Roles y permisos por sucursal" },
            ].map((item) => (
              <div key={item.texto} className="flex flex-col gap-3 bg-background px-6 py-8">
                <item.icon className="h-5 w-5 text-primary" />
                <p className="text-sm text-muted-foreground">{item.texto}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <div className="mb-10 max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Cómo está organizado
            </span>
            <h2 className="mt-2 text-balance font-display text-3xl font-bold sm:text-4xl">
              Un módulo por cada parte de la operación
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {MODULOS.map((m) => (
              <div
                key={m.titulo}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6 shadow-sm"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
                  <m.icon className="h-5 w-5" />
                </span>
                <h3 className="font-display text-lg font-semibold">{m.titulo}</h3>
                <p className="text-sm text-muted-foreground">{m.texto}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-border/70 bg-secondary/20">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <div className="mb-10 max-w-2xl">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Un sistema, seis roles
              </span>
              <h2 className="mt-2 text-balance font-display text-3xl font-bold sm:text-4xl">
                Cada usuario ve solo lo que le corresponde
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ROLES.map((rol) => (
                <div key={rol} className="rounded-xl border border-border bg-card p-5">
                  <p className="font-display text-base font-semibold">{ROL_LABELS[rol]}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{ROL_DESCRIPCIONES[rol]}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
