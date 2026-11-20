import type { Metadata } from "next";
import { Suspense } from "react";
import { hoy } from "@/server/domain/fechas";
import { datosParaFormulario } from "@/server/services/juntadas";
import { accederAlGrupo, CLASE_PAGINA, SinAcceso, Volver } from "../../acceso";
import { FormularioJuntada } from "../formulario-juntada";

export const metadata: Metadata = { title: "Registrar juntada · Liga de Amigos" };

export default function PaginaNuevaJuntada({
  params,
}: PageProps<"/grupos/[grupoId]/juntadas/nueva">) {
  return (
    <main className={CLASE_PAGINA}>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Contenido params={params} />
      </Suspense>
    </main>
  );
}

async function Contenido({ params }: { params: Promise<{ grupoId: string }> }) {
  const acceso = await accederAlGrupo((await params).grupoId);
  if (!acceso) return <SinAcceso />;
  const { usuario, grupo } = acceso;

  const { integrantes, acciones } = await datosParaFormulario(usuario.id, grupo.id);

  return (
    <div className="space-y-8">
      <Volver href={`/grupos/${grupo.id}`} texto={grupo.nombre} />
      <h1 className="font-display text-5xl tracking-wide">Registrar juntada</h1>
      <FormularioJuntada
        grupoId={grupo.id}
        integrantes={integrantes}
        acciones={acciones}
        hoy={hoy()}
      />
    </div>
  );
}
