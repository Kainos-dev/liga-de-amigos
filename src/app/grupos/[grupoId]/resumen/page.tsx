import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { conSigno, fechaCorta } from "@/lib/fechas";
import { ErrorDeDominio } from "@/server/domain/errores";
import { nombreDeMes } from "@/server/domain/resumenes";
import { obtenerResumenMensual, type VistaMensual } from "@/server/services/resumenes";
import { accederAlGrupo, CLASE_PAGINA, Esqueleto, SinAcceso, Volver } from "../acceso";
import { DatoGrande, plural, TarjetaDestacado } from "./destacados";

export const metadata: Metadata = { title: "Resumen del mes · Liga de Amigos" };

export default function PaginaResumenMensual({
  params,
  searchParams,
}: PageProps<"/grupos/[grupoId]/resumen">) {
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

  const { mes: mesTexto } = await searchParams;
  const mes =
    typeof mesTexto === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(mesTexto) ? mesTexto : undefined;

  let vista: VistaMensual;
  try {
    vista = await obtenerResumenMensual(usuario.id, grupo.id, mes);
  } catch (error) {
    if (error instanceof ErrorDeDominio) return <SinAcceso mensaje={error.message} />;
    throw error;
  }
  const { resumen, personas } = vista;
  const base = `/grupos/${grupo.id}`;

  return (
    <div className="space-y-6">
      <Volver href={base} texto={grupo.nombre} />

      <div className="space-y-3">
        <p className="text-sm font-medium tracking-widest text-amarillo uppercase">Resumen del mes</p>
        <h1 className="font-display text-5xl leading-none tracking-wide first-letter:uppercase">
          {nombreDeMes(resumen.mes)}
        </h1>
        <nav className="flex justify-between gap-3" aria-label="Meses">
          {vista.anterior ? (
            <Link href={`${base}/resumen?mes=${vista.anterior}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              ← <span className="first-letter:uppercase">{nombreDeMes(vista.anterior)}</span>
            </Link>
          ) : (
            <span />
          )}
          {vista.siguiente && (
            <Link href={`${base}/resumen?mes=${vista.siguiente}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <span className="first-letter:uppercase">{nombreDeMes(vista.siguiente)}</span> →
            </Link>
          )}
        </nav>
      </div>

      {!resumen.hayActividad ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">
          Este mes no hubo juntadas ni puntos cargados.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <DatoGrande titulo="Juntadas" valor={resumen.juntadas} />
            <DatoGrande
              titulo="Promedio por juntada"
              valor={resumen.promedioDeAsistentes === null ? "–" : String(resumen.promedioDeAsistentes).replace(".", ",")}
            />
          </div>

          <div className="space-y-3">
            <TarjetaDestacado titulo="⭐ Figura del mes" destacado={resumen.figura} personas={personas} detalle={(v) => `${conSigno(v)} puntos en el mes`} />
            <TarjetaDestacado titulo="🙋 El más presente" destacado={resumen.masAsistencia} personas={personas} detalle={(v) => `Fue a ${plural(v, "juntada", "juntadas")}`} />
            {resumen.porAccion.map((d) => (
              <TarjetaDestacado key={d.accionId} titulo={`🏅 ${d.nombre}`} destacado={d} personas={personas} detalle={(v) => plural(v, "vez", "veces")} />
            ))}
            <TarjetaDestacado titulo="📈 Mayor subida en la tabla" destacado={resumen.mayorSubida} personas={personas} detalle={(v) => `Subió ${plural(v, "puesto", "puestos")}`} />
            <TarjetaDestacado titulo="📉 Mayor bajada en la tabla" destacado={resumen.mayorBajada} personas={personas} tono="negativo" detalle={(v) => `Bajó ${plural(-v, "puesto", "puestos")}`} />
            <TarjetaDestacado titulo="💀 El desastre del mes" destacado={resumen.desastre} personas={personas} tono="negativo" detalle={(v) => `${v} puntos perdidos`} />
          </div>

          {resumen.juntadaMasConcurrida && (
            <Link
              href={`${base}/juntadas/${resumen.juntadaMasConcurrida.juntadaId}`}
              className="block rounded-xl border border-border p-4 hover:bg-muted"
            >
              <p className="text-sm text-muted-foreground">🎉 La juntada más concurrida</p>
              <p className="font-heading font-semibold">
                {resumen.juntadaMasConcurrida.titulo ?? "Juntada"} ·{" "}
                <span className="first-letter:uppercase">{fechaCorta(resumen.juntadaMasConcurrida.fecha)}</span>
              </p>
              <p className="text-sm text-amarillo">
                Fueron {resumen.juntadaMasConcurrida.asistentes}
              </p>
            </Link>
          )}

          <p className="text-xs text-muted-foreground">
            Los destacados salen de lo cargado. Si en algo no hubo datos, no se muestra.
          </p>
        </>
      )}

      <Link href={`${base}/resumen-anual`} className={buttonVariants({ variant: "secondary", size: "lg", className: "w-full" })}>
        Ver el resumen del año
      </Link>
    </div>
  );
}
