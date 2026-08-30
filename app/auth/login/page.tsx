import Link from "next/link";
import { Cpu } from "lucide-react";
import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <div className="grid min-h-svh md:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#0b0713] p-10 text-white md:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{ backgroundImage: "linear-gradient(135deg, hsl(262 85% 55%), hsl(287 90% 62%))" }}
        />
        <Link href="/" className="relative z-10 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg gradient-accent text-white">
            <Cpu className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            Zona<span className="text-primary">Hardware</span>
          </span>
        </Link>
        <div className="relative z-10 max-w-md">
          <h1 className="text-balance font-display text-4xl font-bold leading-tight">
            Potencia real, <span className="gradient-accent-text">control total.</span>
          </h1>
          <p className="mt-4 text-balance text-white/70">
            Gestioná catálogo, depósito y pedidos desde un solo panel, con el
            rol que te corresponde.
          </p>
        </div>
        <p className="relative z-10 text-xs text-white/50">
          © {new Date().getFullYear()} ZonaHardware
        </p>
      </div>

      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
