"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  PackageSearch,
  ArrowUpDown,
  Store,
  UserPlus,
  Users,
  Menu,
  X,
} from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { ROL_LABELS } from "@/lib/site/roles";

const NAV_ITEMS: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/productos", label: "Catálogo", icon: PackageSearch },
  { href: "/admin/movimientos", label: "Movimientos de Stock", icon: ArrowUpDown },
  { href: "/admin/sucursales", label: "Sucursales", icon: Store },
  { href: "/admin/revendedores", label: "Revendedores", icon: UserPlus },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
];

function initials(nombre: string, apellido: string) {
  return `${nombre[0] ?? ""}${apellido[0] ?? ""}`.toUpperCase();
}

function NavList({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV_ITEMS.map((item) => {
        const activo = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activo
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Icon
              className={`h-[18px] w-[18px] shrink-0 ${
                activo ? "text-indigo-600" : "text-slate-400"
              }`}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminSidebar({
  nombre,
  apellido,
  rolCodigo,
}: {
  nombre: string;
  apellido: string;
  rolCodigo: string;
}) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const rolLabel = ROL_LABELS[rolCodigo] ?? rolCodigo;

  return (
    <>
      {/* Topbar móvil */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-sm font-bold text-white">
            ZH
          </span>
          <span className="font-semibold text-slate-900">ZonaHardware</span>
        </Link>
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Abrir menú"
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Overlay móvil */}
      {abierto && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 md:hidden"
          onClick={() => setAbierto(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-sm font-bold text-white">
              ZH
            </span>
            <div className="leading-tight">
              <p className="font-semibold text-slate-900">ZonaHardware</p>
              <p className="text-xs text-slate-400">Panel interno</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar menú"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          <NavList pathname={pathname} onNavigate={() => setAbierto(false)} />
        </div>

        <div className="border-t border-slate-200 p-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
              {initials(nombre, apellido)}
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium text-slate-900">
                {nombre} {apellido}
              </p>
              <p className="truncate text-xs text-slate-500">{rolLabel}</p>
            </div>
          </div>
          <LogoutButton variant="outline" size="sm" className="w-full" />
        </div>
      </aside>
    </>
  );
}
