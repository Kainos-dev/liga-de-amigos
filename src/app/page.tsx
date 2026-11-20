import { ArrowRight, CalendarCheck, Clock, KeyRound, Plus, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Avatar, AvataresApilados } from "@/components/avatar";
import { buttonVariants } from "@/components/ui/button";
import { hoy } from "@/server/domain/fechas";
import { anioDeTemporada } from "@/server/domain/temporadas";
import type { Usuario } from "@/server/services/cuentas";
import { type ResumenDeGrupo, misGrupos, obtenerGrupo } from "@/server/services/grupos";
import { misSolicitudesPendientes } from "@/server/services/solicitudes";
import { obtenerTabla } from "@/server/services/tabla";
import { usuarioActual } from "@/server/sesion";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 pt-8 pb-16">
      {/* Con cacheComponents, lo que lee la sesión (cookies) va dentro de un Suspense. */}
      <Suspense fallback={<EsqueletoInicio />}>
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

function PildoraTemporada() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amarillo/35 bg-amarillo/10 px-3 py-1 text-xs font-semibold tracking-widest text-amarillo uppercase">
      <span aria-hidden className="size-1.5 rounded-full bg-amarillo" />
      Temporada{" "}
      <Suspense fallback={null}>
        <AnioActual />
      </Suspense>
    </span>
  );
}

async function ContenidoSegunSesion() {
  const usuario = await usuarioActual();
  return usuario ? <InicioConSesion usuario={usuario} /> : <Bienvenida />;
}

// ─── Sin sesión ─────────────────────────────────────────────────────────────

const PASOS = [
  { Icono: Users, titulo: "Armá tu grupo", texto: "Creás el grupo y les pasás el código a tus amigos." },
  { Icono: CalendarCheck, titulo: "Registrá cada juntada", texto: "Quién fue, quién puso casa, quién cocinó, quién faltó…" },
  { Icono: Trophy, titulo: "Peleá por ser el mejor amigo", texto: "Cada cosa suma o resta puntos. A fin de año, hay campeón." },
];

function Bienvenida() {
  return (
    <>
      <header className="aparece space-y-4 pt-6">
        <PildoraTemporada />
        {/*
          Un solo renglón, lo más grande que entre: el tamaño sale del ancho de la
          columna (100cqw = todo el ancho del contenedor). "Liga de Amigos" en
          Bangers mide ~5,6 veces el tamaño de la letra; con 6,2 queda margen para
          la sombra y no se corta en ningún celular.
        */}
        <div className="@container">
          <h1 className="titulo-sticker font-display text-[length:calc(100cqw/6.2)] leading-none tracking-wide whitespace-nowrap">
            Liga de <span className="text-naranja">Amigos</span>
          </h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Registrá las juntadas del grupo, sumá puntos y descubrí quién es el mejor amigo.
        </p>
      </header>

      <ol className="space-y-3">
        {PASOS.map(({ Icono, titulo, texto }, i) => (
          <li
            key={titulo}
            className="aparece relative flex items-center gap-4 overflow-hidden rounded-2xl bg-card p-4 relieve"
            style={{ animationDelay: `${0.12 + i * 0.08}s` }}
          >
            <span className="font-display w-7 shrink-0 text-center text-4xl leading-none text-amarillo">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="font-heading block font-semibold">{titulo}</span>
              <span className="block text-sm text-muted-foreground">{texto}</span>
            </span>
            <Icono aria-hidden className="size-7 shrink-0 text-naranja" strokeWidth={1.8} />
          </li>
        ))}
      </ol>

      <div className="aparece space-y-3" style={{ animationDelay: "0.4s" }}>
        <Link href="/crear-cuenta" className={buttonVariants({ size: "lg", className: "presionable h-12 w-full text-base" })}>
          Crear cuenta
        </Link>
        <Link
          href="/entrar"
          className={buttonVariants({ size: "lg", variant: "secondary", className: "presionable h-12 w-full text-base" })}
        >
          Ya tengo cuenta
        </Link>
      </div>
    </>
  );
}

// ─── Con sesión ─────────────────────────────────────────────────────────────

type GrupoConDetalle = ResumenDeGrupo & {
  integrantes: { nombre: string; fotoUrl: string | null }[];
  miPosicion: { puesto: number; puntos: number } | null; // null si nadie sumó puntos
  lider: { nombre: string; puntos: number } | null;
};

/** Para cada grupo, los avatares y cómo viene la tabla (pocos grupos por persona). */
async function detallarGrupos(usuarioId: string, grupos: ResumenDeGrupo[]): Promise<GrupoConDetalle[]> {
  return Promise.all(
    grupos.map(async (grupo) => {
      const [detalle, tabla] = await Promise.all([obtenerGrupo(usuarioId, grupo.id), obtenerTabla(usuarioId, grupo.id)]);
      const hayPuntos = tabla.filas.some((f) => f.puntos !== 0);
      const miFila = tabla.filas.find((f) => f.integranteId === tabla.miIntegranteId);
      const primera = tabla.filas[0];
      return {
        ...grupo,
        integrantes: detalle.integrantes.map((i) => ({ nombre: i.nombre, fotoUrl: i.fotoUrl })),
        miPosicion: hayPuntos && miFila ? { puesto: miFila.posicion, puntos: miFila.puntos } : null,
        lider: hayPuntos && primera ? { nombre: primera.nombre, puntos: primera.puntos } : null,
      };
    }),
  );
}

async function InicioConSesion({ usuario }: { usuario: Usuario }) {
  const [grupos, pendientes] = await Promise.all([misGrupos(usuario.id), misSolicitudesPendientes(usuario.id)]);
  const detallados = await detallarGrupos(usuario.id, grupos);
  const sinNada = grupos.length === 0 && pendientes.length === 0;

  return (
    <>
      <header className="aparece space-y-4">
        <div className="flex items-center justify-between">
          <PildoraTemporada />
          <Link href="/cuenta" aria-label="Mi cuenta" className="presionable rounded-full ring-2 ring-amarillo/50 ring-offset-2 ring-offset-background">
            <Avatar nombre={usuario.nombre} fotoUrl={usuario.fotoUrl} />
          </Link>
        </div>
        <h1 className="font-display text-4xl leading-none tracking-wide text-muted-foreground">
          Hola,
          <span className="titulo-sticker block text-6xl break-words text-foreground">{usuario.nombre}</span>
        </h1>
      </header>

      {sinNada ? (
        <div className="aparece relative overflow-hidden rounded-3xl bg-card p-6 text-center relieve" style={{ animationDelay: "0.1s" }}>
          <span aria-hidden className="trama-amarilla absolute inset-0 opacity-40 [mask-image:radial-gradient(circle_at_50%_0%,#000,transparent_70%)]" />
          <Trophy aria-hidden className="relative mx-auto size-14 text-amarillo" strokeWidth={1.6} />
          <p className="relative mt-3 font-heading text-xl font-bold">Todavía no estás en ningún grupo</p>
          <p className="relative mt-1 text-sm text-muted-foreground">
            Creá uno para tus amigos o pedí entrar con el código que te pasaron.
          </p>
        </div>
      ) : (
        <section className="space-y-3">
          <h2 className="aparece font-heading text-xl font-bold" style={{ animationDelay: "0.08s" }}>
            Mis grupos
          </h2>
          <ul className="space-y-3.5">
            {detallados.map((grupo, i) => (
              <li key={grupo.id} className="aparece" style={{ animationDelay: `${0.12 + i * 0.08}s` }}>
                <TarjetaDeGrupo grupo={grupo} />
              </li>
            ))}
            {pendientes.map((solicitud, i) => (
              <li
                key={solicitud.id}
                className="aparece flex items-center gap-3 rounded-2xl border-2 border-dashed border-border p-4"
                style={{ animationDelay: `${0.12 + (detallados.length + i) * 0.08}s` }}
              >
                <Clock aria-hidden className="size-6 shrink-0 text-amarillo" />
                <span className="min-w-0">
                  <span className="font-heading block truncate font-semibold">{solicitud.grupoNombre}</span>
                  <span className="block text-sm text-muted-foreground">Esperando que un administrador te acepte</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="aparece grid grid-cols-2 gap-3" style={{ animationDelay: "0.3s" }}>
        <Link
          href="/grupos/nuevo"
          className="presionable relative flex flex-col gap-6 overflow-hidden rounded-3xl bg-naranja p-4 text-violeta-oscuro"
        >
          <span aria-hidden className="trama-oscura absolute inset-0 [mask-image:linear-gradient(160deg,transparent_40%,#000)]" />
          <span className="relative flex size-11 items-center justify-center rounded-full bg-violeta-oscuro text-naranja">
            <Plus aria-hidden className="size-6" strokeWidth={3} />
          </span>
          <span className="relative font-display text-2xl leading-none tracking-wide">Crear grupo</span>
        </Link>
        <Link href="/unirme" className="presionable relative flex flex-col gap-6 overflow-hidden rounded-3xl bg-card p-4 relieve">
          <span className="flex size-11 items-center justify-center rounded-full bg-amarillo text-violeta-oscuro">
            <KeyRound aria-hidden className="size-5" strokeWidth={2.4} />
          </span>
          <span className="font-display text-2xl leading-none tracking-wide">Unirme con código</span>
        </Link>
      </div>
    </>
  );
}

/** Un grupo: nombre grande, quiénes están, tu puesto y quién va primero. */
function TarjetaDeGrupo({ grupo }: { grupo: GrupoConDetalle }) {
  const voyPrimero = grupo.miPosicion?.puesto === 1;

  return (
    <Link
      href={`/grupos/${grupo.id}`}
      className="presionable relative block overflow-hidden rounded-3xl bg-linear-to-br from-secondary to-card p-5 relieve"
    >
      <span aria-hidden className="trama-amarilla absolute -top-2 -right-2 h-36 w-40 [mask-image:radial-gradient(circle_at_80%_20%,#000_10%,transparent_70%)]" />

      {grupo.solicitudesPendientes > 0 && (
        <span className="relative mb-3 inline-flex rounded-full bg-amarillo px-2.5 py-0.5 text-xs font-bold text-violeta-oscuro">
          {grupo.solicitudesPendientes === 1 ? "1 quiere entrar" : `${grupo.solicitudesPendientes} quieren entrar`}
        </span>
      )}

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-3">
          <p className="font-display text-4xl leading-[0.9] tracking-wide break-words">{grupo.nombre}</p>
          <div className="flex items-center gap-2.5">
            <AvataresApilados personas={grupo.integrantes} maximo={5} />
            <span className="text-xs text-muted-foreground">
              {grupo.cantidadDeIntegrantes} {grupo.cantidadDeIntegrantes === 1 ? "integrante" : "integrantes"}
              {grupo.rol === "admin" && " · Admin"}
            </span>
          </div>
        </div>

        {grupo.miPosicion && (
          <div className="shrink-0 text-right">
            <span className="block font-display text-6xl leading-[0.85] text-amarillo [text-shadow:3px_3px_0_var(--violeta-oscuro)]">
              {grupo.miPosicion.puesto}º
            </span>
            <span className="font-heading text-sm font-bold tabular-nums">{grupo.miPosicion.puntos} pts</span>
          </div>
        )}
      </div>

      <div className="relative mt-4 flex items-center justify-between gap-3 border-t border-border pt-3 text-sm">
        <span className="min-w-0 truncate text-muted-foreground">
          {!grupo.lider
            ? "Todavía nadie sumó puntos"
            : voyPrimero
              ? "¡Vas primero!"
              : `Va primero: ${grupo.lider.nombre} (${grupo.lider.puntos})`}
        </span>
        <span className="flex shrink-0 items-center gap-1 font-semibold text-amarillo">
          Entrar <ArrowRight aria-hidden className="size-4" />
        </span>
      </div>
    </Link>
  );
}

function EsqueletoInicio() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando">
      <div className="h-7 w-36 animate-pulse rounded-full bg-card" />
      <div className="h-24 w-3/4 animate-pulse rounded-xl bg-card" />
      <div className="h-44 animate-pulse rounded-3xl bg-card" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-32 animate-pulse rounded-3xl bg-card" />
        <div className="h-32 animate-pulse rounded-3xl bg-card" />
      </div>
    </div>
  );
}
