import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { ErrorDeDominio } from "@/server/domain/errores";
import { obtenerResumenAnual, type VistaAnual } from "@/server/services/resumenes";
import { accederAlGrupo, CLASE_PAGINA, Esqueleto, SinAcceso } from "../../acceso";
import { armarDiapositivas } from "./diapositivas";
import { Historia } from "./historia";

export const metadata: Metadata = { title: "Tu año en la liga · Liga de Amigos" };

export default function PaginaHistoria({
  params,
  searchParams,
}: PageProps<"/grupos/[grupoId]/resumen-anual/historia">) {
  return (
    <Suspense fallback={<main className={CLASE_PAGINA}><Esqueleto /></main>}>
      <Contenido params={params} searchParams={searchParams} />
    </Suspense>
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
  if (!acceso) return <main className={CLASE_PAGINA}><SinAcceso /></main>;
  const { usuario, grupo } = acceso;

  const { anio: anioTexto } = await searchParams;
  const anio = typeof anioTexto === "string" && /^\d{4}$/.test(anioTexto) ? Number(anioTexto) : undefined;
  const volver = `/grupos/${grupo.id}/resumen-anual${anio ? `?anio=${anio}` : ""}`;

  let vista: VistaAnual;
  try {
    vista = await obtenerResumenAnual(usuario.id, grupo.id, anio);
  } catch (error) {
    if (error instanceof ErrorDeDominio) return <main className={CLASE_PAGINA}><SinAcceso mensaje={error.message} /></main>;
    throw error;
  }

  if (!vista.resumen.hayActividad) {
    return (
      <main className={CLASE_PAGINA}>
        <h1 className="font-display text-5xl tracking-wide">Todavía no hay historia</h1>
        <p className="text-muted-foreground">
          Cuando el grupo registre juntadas, acá vas a ver el resumen del año.
        </p>
        <Link href={volver} className={buttonVariants({ size: "lg" })}>
          Volver
        </Link>
      </main>
    );
  }

  return <Historia diapositivas={armarDiapositivas(vista, grupo.nombre)} volver={volver} />;
}
