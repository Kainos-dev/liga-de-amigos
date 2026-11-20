import type { Metadata } from "next";
import { Suspense } from "react";
import { hoy } from "@/server/domain/fechas";
import { esIdValido } from "@/server/api";
import { datosParaFormulario, obtenerJuntada } from "@/server/services/juntadas";
import { accederAlGrupo, CLASE_PAGINA, Esqueleto, oNulo, SinAcceso, Volver } from "../../../acceso";
import { FormularioJuntada } from "../../formulario-juntada";

export const metadata: Metadata = { title: "Editar juntada · Liga de Amigos" };

export default function PaginaEditarJuntada({
  params,
}: PageProps<"/grupos/[grupoId]/juntadas/[juntadaId]/editar">) {
  return (
    <main className={CLASE_PAGINA}>
      <Suspense fallback={<Esqueleto />}>
        <Contenido params={params} />
      </Suspense>
    </main>
  );
}

async function Contenido({
  params,
}: {
  params: Promise<{ grupoId: string; juntadaId: string }>;
}) {
  const { grupoId, juntadaId } = await params;
  const acceso = await accederAlGrupo(grupoId);
  if (!acceso) return <SinAcceso />;
  const { usuario, grupo } = acceso;

  const juntada = esIdValido(juntadaId)
    ? await oNulo(() => obtenerJuntada(usuario.id, grupo.id, juntadaId))
    : null;
  if (!juntada) return <SinAcceso mensaje="Esa juntada no existe en este grupo." />;

  const volver = <Volver href={`/grupos/${grupo.id}/juntadas/${juntada.id}`} texto="Volver a la juntada" />;

  if (!juntada.puedeEditar) {
    return (
      <div className="space-y-6">
        {volver}
        <p className="text-muted-foreground">
          Pasaron más de 48 horas desde que se cargó: solo un administrador la puede editar.
        </p>
      </div>
    );
  }

  const { integrantes, acciones } = await datosParaFormulario(usuario.id, grupo.id, juntada.id);

  return (
    <div className="space-y-8">
      {volver}
      <h1 className="font-display text-5xl tracking-wide">Editar juntada</h1>
      <FormularioJuntada
        grupoId={grupo.id}
        integrantes={integrantes}
        acciones={acciones}
        hoy={hoy()}
        inicial={{
          id: juntada.id,
          fecha: juntada.fecha,
          titulo: juntada.titulo,
          notas: juntada.notas,
          invitadosExternos: juntada.invitadosExternos,
          participaciones: juntada.participaciones,
          acciones: juntada.acciones,
        }}
      />
    </div>
  );
}
