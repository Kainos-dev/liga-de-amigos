import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AvatarDeIntegrante } from "@/components/avatar";
import { conSigno } from "@/lib/fechas";
import { ErrorDeDominio } from "@/server/domain/errores";
import { type FilaDeLaLiga, obtenerTabla, type TablaDeLaLiga } from "@/server/services/tabla";
import { accederAlGrupo, CLASE_PAGINA, SinAcceso, Volver } from "../acceso";

export const metadata: Metadata = { title: "Tabla · Liga de Amigos" };

const formatoDiaMes = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export default function PaginaTabla({ params, searchParams }: PageProps<"/grupos/[grupoId]/tabla">) {
  return (
    <main className={CLASE_PAGINA}>
      <Suspense fallback={<p className="text-muted-foreground">Cargando tabla…</p>}>
        <Contenido params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Contenido({
  params,
  searchParams,
}: {
  params: Promise<{ grupoId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const acceso = await accederAlGrupo((await params).grupoId);
  if (!acceso) return <SinAcceso />;
  const { usuario, grupo } = acceso;

  const { anio: anioTexto } = await searchParams;
  const anio = typeof anioTexto === "string" && /^\d{4}$/.test(anioTexto) ? Number(anioTexto) : undefined;

  let tabla: TablaDeLaLiga;
  try {
    tabla = await obtenerTabla(usuario.id, grupo.id, anio);
  } catch (error) {
    if (error instanceof ErrorDeDominio) {
      return <SinAcceso mensaje={error.message} />;
    }
    throw error;
  }

  return (
    <div className="space-y-6">
      <Volver href={`/grupos/${grupo.id}`} texto={grupo.nombre} />

      <div className="space-y-2">
        <h1 className="font-display text-6xl leading-none tracking-wide">
          Tabla <span className="text-naranja">{tabla.anio}</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          {tabla.juntadas} {tabla.juntadas === 1 ? "juntada" : "juntadas"}
          {tabla.cerrada && " · Temporada cerrada"}
          {tabla.comparadoCon &&
            ` · Flechas: cambios desde el ${formatoDiaMes.format(new Date(`${tabla.comparadoCon}T00:00:00Z`))}`}
        </p>
      </div>

      {tabla.temporadas.length > 1 && (
        <nav className="flex flex-wrap gap-2" aria-label="Temporadas">
          {tabla.temporadas.map((anioOpcion) => (
            <Link
              key={anioOpcion}
              href={`/grupos/${grupo.id}/tabla?anio=${anioOpcion}`}
              aria-current={anioOpcion === tabla.anio ? "page" : undefined}
              className="rounded-full bg-muted/60 px-3 py-1 text-sm aria-[current=page]:bg-amarillo aria-[current=page]:font-semibold aria-[current=page]:text-violeta-oscuro"
            >
              {anioOpcion}
            </Link>
          ))}
        </nav>
      )}

      <ol className="space-y-2">
        {tabla.filas.map((fila) => (
          <FilaDeTabla
            key={fila.integranteId}
            fila={fila}
            acciones={tabla.acciones}
            esUnoMismo={fila.integranteId === tabla.miIntegranteId}
          />
        ))}
      </ol>

      <p className="text-xs text-muted-foreground">
        Tocá a alguien para ver el detalle. Si empatan en puntos, desempata quien fue a más
        juntadas y después quien hizo más contribuciones. Si siguen iguales, comparten el puesto.
      </p>
    </div>
  );
}

function FilaDeTabla({
  fila,
  acciones,
  esUnoMismo,
}: {
  fila: FilaDeLaLiga;
  acciones: Record<string, string>;
  esUnoMismo: boolean;
}) {
  const podio = fila.posicion <= 3 && fila.puntos !== 0;
  // Del desglose, primero lo que más pesó (para bien o para mal).
  const desglose = Object.entries(fila.desglose).sort(
    ([, a], [, b]) => Math.abs(b.puntos) - Math.abs(a.puntos),
  );

  return (
    <li>
      <details
        className={`group rounded-xl bg-card ${esUnoMismo ? "ring-1 ring-amarillo/60" : ""} ${fila.activo ? "" : "opacity-70"}`}
      >
        <summary className="flex cursor-pointer list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
          <span
            className={`font-heading w-7 shrink-0 text-center text-xl font-bold tabular-nums ${podio ? "text-amarillo" : "text-muted-foreground"}`}
          >
            {fila.posicion}
          </span>
          <AvatarDeIntegrante nombre={fila.nombre} emoji={fila.avatarEmoji} color={fila.avatarColor} />
          <span className="min-w-0 flex-1">
            <span className="font-heading block truncate font-semibold">
              {fila.nombre}
              {esUnoMismo && <span className="font-normal text-muted-foreground"> (vos)</span>}
            </span>
            {!fila.activo && <span className="block text-xs text-muted-foreground">Ya no está en el grupo</span>}
          </span>
          <Cambio cambio={fila.cambio} />
          <span
            className={`font-heading w-14 shrink-0 text-right text-xl font-bold tabular-nums ${fila.puntos < 0 ? "text-naranja" : ""}`}
          >
            {fila.puntos}
          </span>
        </summary>

        <div className="space-y-4 border-t border-border px-3 pt-3 pb-4">
          <dl className="grid grid-cols-4 gap-2 text-center">
            <Dato titulo="Fue" valor={fila.asistencias} />
            <Dato titulo="Faltó" valor={fila.faltas} />
            <Dato
              titulo="Asistencia"
              valor={fila.porcentajeDeAsistencia === null ? "–" : `${fila.porcentajeDeAsistencia}%`}
            />
            <Dato titulo="Aportes" valor={fila.contribuciones} />
          </dl>
          {desglose.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no sumó ni restó puntos.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {desglose.map(([accionId, { veces, puntos }]) => (
                <li key={accionId} className="flex justify-between gap-3">
                  <span>
                    {acciones[accionId] ?? "Acción"}{" "}
                    <span className="text-muted-foreground">×{veces}</span>
                  </span>
                  <span
                    className={`font-heading font-semibold tabular-nums ${puntos < 0 ? "text-naranja" : "text-amarillo"}`}
                  >
                    {conSigno(puntos)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </li>
  );
}

function Cambio({ cambio }: { cambio: number | null }) {
  if (cambio === null || cambio === 0) return null;
  const subio = cambio > 0;
  return (
    <span
      className={`shrink-0 text-xs font-semibold tabular-nums ${subio ? "text-amarillo" : "text-naranja"}`}
      aria-label={subio ? `Subió ${cambio} puestos` : `Bajó ${-cambio} puestos`}
    >
      {subio ? "▲" : "▼"}
      {Math.abs(cambio)}
    </span>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string | number }) {
  return (
    <div className="rounded-lg bg-muted/50 py-2">
      <dt className="text-[11px] text-muted-foreground">{titulo}</dt>
      <dd className="font-heading text-lg font-semibold tabular-nums">{valor}</dd>
    </div>
  );
}
