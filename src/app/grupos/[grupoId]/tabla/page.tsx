import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ErrorDeDominio } from "@/server/domain/errores";
import { obtenerTabla, type TablaDeLaLiga } from "@/server/services/tabla";
import { accederAlGrupo, CLASE_PAGINA, Esqueleto, SinAcceso, Volver } from "../acceso";
import { TablaInteractiva } from "./tabla-interactiva";

export const metadata: Metadata = { title: "Tabla · Liga de Amigos" };

const formatoDiaMes = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export default function PaginaTabla({ params, searchParams }: PageProps<"/grupos/[grupoId]/tabla">) {
  return (
    <main className={CLASE_PAGINA}>
      <Suspense fallback={<Esqueleto />}>
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

      <div className="aparece flex items-end justify-between gap-3">
        <h1 className="titulo-sticker font-display text-6xl leading-[0.9] tracking-wide">
          Tabla <span className="text-amarillo">{tabla.anio}</span>
        </h1>
        <p className="pb-1.5 text-right text-xs text-muted-foreground">
          {tabla.juntadas} {tabla.juntadas === 1 ? "juntada" : "juntadas"}
          {tabla.cerrada && <span className="block">Temporada cerrada</span>}
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

      <TablaInteractiva filas={tabla.filas} acciones={tabla.acciones} miIntegranteId={tabla.miIntegranteId} />

      <p className="text-xs text-muted-foreground">
        {tabla.comparadoCon &&
          `Las flechas muestran cuántos puestos subió o bajó cada uno desde el ${formatoDiaMes.format(new Date(`${tabla.comparadoCon}T00:00:00Z`))}. `}
        Si empatan en puntos, desempata quien fue a más juntadas y después quien hizo más
        contribuciones. Si siguen iguales, comparten el puesto.
      </p>
    </div>
  );
}
