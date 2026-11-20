import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { conSigno } from "@/lib/fechas";
import { ErrorDeDominio } from "@/server/domain/errores";
import { obtenerResumenAnual, type VistaAnual } from "@/server/services/resumenes";
import { accederAlGrupo, CLASE_PAGINA, SinAcceso, Volver } from "../acceso";
import { DatoGrande, listaDeNombres, plural, TarjetaDestacado } from "../resumen/destacados";
import { CerrarTemporada } from "./cerrar-temporada";
import { GraficoPorMes } from "./grafico-por-mes";

export const metadata: Metadata = { title: "Resumen del año · Liga de Amigos" };

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const nombresDeMeses = (meses: number[]) => {
  const nombres = meses.map((m) => MESES[m - 1]);
  return nombres.length <= 1 ? nombres.join("") : `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
};

export default function PaginaResumenAnual({
  params,
  searchParams,
}: PageProps<"/grupos/[grupoId]/resumen-anual">) {
  return (
    <main className={CLASE_PAGINA}>
      <Suspense fallback={<p className="text-muted-foreground">Cargando resumen…</p>}>
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

  let vista: VistaAnual;
  try {
    vista = await obtenerResumenAnual(usuario.id, grupo.id, anio);
  } catch (error) {
    if (error instanceof ErrorDeDominio) return <SinAcceso mensaje={error.message} />;
    throw error;
  }
  const { resumen, personas } = vista;
  const base = `/grupos/${grupo.id}`;

  return (
    <div className="space-y-6">
      <Volver href={base} texto={grupo.nombre} />

      <div className="space-y-2">
        <p className="text-sm font-medium tracking-widest text-amarillo uppercase">Resumen del año</p>
        <h1 className="font-display text-6xl leading-none tracking-wide">
          Temporada <span className="text-naranja">{resumen.anio}</span>
        </h1>
        {vista.cerrada && (
          <p className="inline-block rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
            Temporada cerrada: resultados finales
          </p>
        )}
      </div>

      {vista.temporadas.length > 1 && (
        <nav className="flex flex-wrap gap-2" aria-label="Temporadas">
          {vista.temporadas.map((anioOpcion) => (
            <Link
              key={anioOpcion}
              href={`${base}/resumen-anual?anio=${anioOpcion}`}
              aria-current={anioOpcion === resumen.anio ? "page" : undefined}
              className="rounded-full bg-muted/60 px-3 py-1 text-sm aria-[current=page]:bg-amarillo aria-[current=page]:font-semibold aria-[current=page]:text-violeta-oscuro"
            >
              {anioOpcion}
            </Link>
          ))}
        </nav>
      )}

      {!resumen.hayActividad ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">
          En esta temporada todavía no hubo juntadas ni puntos cargados.
        </p>
      ) : (
        <>
          {resumen.campeon && (
            <div className="space-y-1 rounded-xl bg-amarillo p-5 text-violeta-oscuro">
              <p className="text-sm font-medium">
                🏆 {vista.cerrada ? "Amigo del año" : "Va primero"}
              </p>
              <p className="font-display text-4xl leading-tight tracking-wide">
                {listaDeNombres(resumen.campeon.integranteIds, personas)}
              </p>
              <p className="text-sm font-medium">
                {resumen.campeon.valor} puntos
                {resumen.campeon.integranteIds.length > 1 && " · empate en el primer puesto"}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <DatoGrande titulo="Juntadas" valor={resumen.juntadas} />
            <DatoGrande
              titulo="Promedio por juntada"
              valor={resumen.promedioDeAsistentes === null ? "–" : String(resumen.promedioDeAsistentes).replace(".", ",")}
            />
          </div>

          <GraficoPorMes juntadasPorMes={resumen.juntadasPorMes} mesesTranscurridos={resumen.mesesTranscurridos} />

          {(resumen.mesMasActivo || resumen.mesMenosActivo) && (
            <div className="space-y-1 text-sm">
              {resumen.mesMasActivo && (
                <p>
                  <span className="text-muted-foreground">Mes con más juntadas: </span>
                  {nombresDeMeses(resumen.mesMasActivo.meses)} ({resumen.mesMasActivo.juntadas})
                </p>
              )}
              {resumen.mesMenosActivo && (
                <p>
                  <span className="text-muted-foreground">Mes más flojo: </span>
                  {nombresDeMeses(resumen.mesMenosActivo.meses)} ({resumen.mesMenosActivo.juntadas})
                </p>
              )}
            </div>
          )}

          <section className="space-y-3">
            <h2 className="font-heading text-lg font-semibold">Reconocimientos</h2>
            <TarjetaDestacado titulo="🙋 El más presente" destacado={resumen.masAsistencia} personas={personas} detalle={(v) => `Fue a ${plural(v, "juntada", "juntadas")}`} />
            <TarjetaDestacado titulo="🎯 El más constante" destacado={resumen.masConstante} personas={personas} detalle={(v) => `${v}% de asistencia`} />
            {resumen.porAccion.map((d) => (
              <TarjetaDestacado key={d.accionId} titulo={`🏅 ${d.nombre}`} destacado={d} personas={personas} detalle={(v) => plural(v, "vez", "veces")} />
            ))}
            <TarjetaDestacado titulo="📈 Mayor ascenso" destacado={resumen.mayorAscenso} personas={personas} detalle={(v) => `Subió ${plural(v, "puesto", "puestos")} desde el arranque`} />
            <TarjetaDestacado titulo="📉 Mayor caída" destacado={resumen.mayorDescenso} personas={personas} tono="negativo" detalle={(v) => `Bajó ${plural(-v, "puesto", "puestos")} desde el arranque`} />
            <TarjetaDestacado titulo="💀 El desastre del año" destacado={resumen.desastre} personas={personas} tono="negativo" detalle={(v) => `${conSigno(v)} puntos perdidos`} />
          </section>

          <p className="text-xs text-muted-foreground">
            «El más constante» compara el porcentaje de asistencia (fue sobre fue + faltó) de
            quienes tuvieron al menos 3 juntadas con dato: así no pierde quien se sumó tarde.
            Si en algo no hubo datos, no se muestra.
          </p>
        </>
      )}

      <Link
        href={`${base}/tabla?anio=${resumen.anio}`}
        className={buttonVariants({ variant: "secondary", size: "lg", className: "w-full" })}
      >
        {vista.cerrada ? "Ver la tabla final" : "Ver la tabla"}
      </Link>

      {vista.puedeCerrar && <CerrarTemporada grupoId={grupo.id} anio={resumen.anio} />}
    </div>
  );
}
