import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { BotonCerrarSesion, EliminarCuenta } from "@/components/botones-de-sesion";
import { usuarioActual } from "@/server/sesion";

export const metadata: Metadata = { title: "Mi cuenta · Liga de Amigos" };

export default function PaginaCuenta() {
  return (
    <main className="mx-auto w-full max-w-md space-y-8 px-4 py-10">
      <h1 className="font-display text-5xl tracking-wide">Mi cuenta</h1>
      {/* Con cacheComponents, lo que lee cookies va dentro de un Suspense. */}
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <DatosDeLaCuenta />
      </Suspense>
    </main>
  );
}

async function DatosDeLaCuenta() {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/entrar");

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 rounded-xl bg-card p-4">
        <Avatar emoji={usuario.avatarEmoji} color={usuario.avatarColor} tamano="grande" />
        <div className="min-w-0">
          <p className="font-heading truncate text-xl font-semibold">{usuario.nombre}</p>
          <p className="text-sm text-muted-foreground">@{usuario.usuario}</p>
        </div>
      </div>

      <BotonCerrarSesion />

      <section className="space-y-3 border-t border-border pt-6">
        <h2 className="font-heading text-lg font-semibold">Zona peligrosa</h2>
        <EliminarCuenta />
      </section>
    </div>
  );
}
