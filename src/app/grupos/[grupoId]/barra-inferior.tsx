"use client";

import { House, Plus, Star, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

/**
 * Navegación fija abajo dentro de un grupo, como en las apps del celular.
 * El botón del centro registra una juntada. Se oculta en los formularios de
 * juntada y en la historia del año (pantalla completa).
 */
export function BarraInferior() {
  const { grupoId } = useParams<{ grupoId: string }>();
  const ruta = usePathname();
  const base = `/grupos/${grupoId}`;

  const oculta =
    ruta.endsWith("/juntadas/nueva") || ruta.endsWith("/editar") || ruta.endsWith("/historia");
  if (oculta) return null;

  const items = [
    { href: base, texto: "Inicio", Icono: House, activo: ruta === base },
    { href: `${base}/tabla`, texto: "Tabla", Icono: Trophy, activo: ruta.startsWith(`${base}/tabla`) },
    { href: `${base}/resumen`, texto: "Resúmenes", Icono: Star, activo: ruta.startsWith(`${base}/resumen`) },
    {
      href: `${base}/integrantes`,
      texto: "Grupo",
      Icono: Users,
      activo: ["/integrantes", "/reglas", "/puntos-sueltos"].some((p) => ruta.startsWith(`${base}${p}`)),
    },
  ];

  const enlace = (item: (typeof items)[number]) => (
    <Link
      key={item.href}
      href={item.href}
      aria-current={item.activo ? "page" : undefined}
      className={`flex flex-col items-center gap-1 text-[11px] ${item.activo ? "font-semibold text-amarillo" : "text-muted-foreground hover:text-foreground"}`}
    >
      <item.Icono aria-hidden className="size-6" strokeWidth={item.activo ? 2.2 : 1.8} />
      {item.texto}
    </Link>
  );

  return (
    <nav
      aria-label="Secciones del grupo"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-violeta-oscuro/85 backdrop-blur-lg"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
    >
      <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-end px-2">
        {enlace(items[0])}
        {enlace(items[1])}
        <Link
          href={`${base}/juntadas/nueva`}
          aria-label="Registrar juntada"
          className="presionable flex flex-col items-center gap-1.5 text-[11px] font-semibold"
        >
          <span className="late -mt-8 flex size-15 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground">
            <Plus aria-hidden className="size-7" strokeWidth={3} />
          </span>
          Registrar
        </Link>
        {enlace(items[2])}
        {enlace(items[3])}
      </div>
    </nav>
  );
}
