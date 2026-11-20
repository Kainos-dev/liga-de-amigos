import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { hoy } from "@/server/domain/fechas";
import { anioDeTemporada } from "@/server/domain/temporadas";
import { Avatar } from "@/components/avatar";
import { buttonVariants } from "@/components/ui/button";
import { misGrupos } from "@/server/services/grupos";
import { misSolicitudesPendientes } from "@/server/services/solicitudes";
import { usuarioActual } from "@/server/sesion";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-12">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-widest text-amarillo">
          Temporada{" "}
          <Suspense fallback={null}>
            <AnioActual />
          </Suspense>
        </p>
        {/* Bangers es angosta: aguanta tamaños muy grandes sin desbordar en celular. */}
        <h1 className="font-display text-7xl leading-[0.9] tracking-wide sm:text-8xl">
          Liga de
          <span className="block text-8xl text-naranja sm:text-9xl">Amigos</span>
        </h1>
        <p className="text-muted-foreground">
          Registrá las juntadas del grupo, sumá puntos y descubrí quién es el
          amigo del año.
        </p>
      </div>

      {/* Con cacheComponents, lo que lee la sesión (cookies) va dentro de un Suspense. */}
      <Suspense fallback={<div className="h-11" />}>
        <ContenidoSegunSesion />
      </Suspense>
    </main>
  );
}

/**
 * El año se calcula en cada visita (con la hora de Argentina). Sin connection(),
 * Next lo calcularía una sola vez al publicar y quedaría fijo en ese año.
 */
async function AnioActual() {
  await connection();
  return <>{anioDeTemporada(hoy())}</>;
}

async function ContenidoSegunSesion() {
  const usuario = await usuarioActual();

  if (!usuario) {
    return (
      <div className="flex gap-3">
        <Link href="/crear-cuenta" className={buttonVariants({ size: "lg" })}>
          Crear cuenta
        </Link>
        <Link href="/entrar" className={buttonVariants({ size: "lg", variant: "secondary" })}>
          Entrar
        </Link>
      </div>
    );
  }

  const [grupos, pendientes] = await Promise.all([
    misGrupos(usuario.id),
    misSolicitudesPendientes(usuario.id),
  ]);

  return (
    <div className="space-y-6">
      <Link href="/cuenta" className="flex items-center gap-3 rounded-xl bg-card p-3 hover:bg-muted">
        <Avatar nombre={usuario.nombre} fotoUrl={usuario.fotoUrl} />
        <div className="min-w-0">
          <p className="font-heading truncate font-semibold">Hola, {usuario.nombre}</p>
          <p className="text-sm text-muted-foreground">Ver mi cuenta</p>
        </div>
      </Link>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">Mis grupos</h2>

        {grupos.length === 0 && pendientes.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Todavía no estás en ningún grupo. Creá uno o pedí entrar con el código que te
            pasaron.
          </p>
        )}

        <ul className="space-y-2">
          {grupos.map((grupo) => (
            <li key={grupo.id}>
              <Link
                href={`/grupos/${grupo.id}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-card p-4 hover:bg-muted"
              >
                <div className="min-w-0">
                  <p className="font-heading truncate font-semibold">{grupo.nombre}</p>
                  <p className="text-sm text-muted-foreground">
                    {grupo.cantidadDeIntegrantes}{" "}
                    {grupo.cantidadDeIntegrantes === 1 ? "integrante" : "integrantes"}
                    {grupo.rol === "admin" && " · Sos admin"}
                  </p>
                </div>
                {grupo.solicitudesPendientes > 0 && (
                  <span className="shrink-0 rounded-full bg-amarillo px-2.5 py-0.5 text-xs font-semibold text-violeta-oscuro">
                    {grupo.solicitudesPendientes}{" "}
                    {grupo.solicitudesPendientes === 1 ? "solicitud" : "solicitudes"}
                  </span>
                )}
              </Link>
            </li>
          ))}
          {pendientes.map((solicitud) => (
            <li
              key={solicitud.id}
              className="rounded-xl border border-dashed border-border p-4 text-sm"
            >
              <p className="font-heading font-semibold">{solicitud.grupoNombre}</p>
              <p className="text-muted-foreground">Esperando que un administrador te acepte</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex gap-3">
        <Link href="/grupos/nuevo" className={buttonVariants({ size: "lg" })}>
          Crear grupo
        </Link>
        <Link href="/unirme" className={buttonVariants({ size: "lg", variant: "secondary" })}>
          Unirme con código
        </Link>
      </div>
    </div>
  );
}
