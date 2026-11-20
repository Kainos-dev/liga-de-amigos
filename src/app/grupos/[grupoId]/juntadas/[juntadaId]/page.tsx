import Link from "next/link";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { Confeti } from "@/components/confeti";
import { buttonVariants } from "@/components/ui/button";
import { conSigno, fechaLarga } from "@/lib/fechas";
import { esIdValido } from "@/server/api";
import type { EstadoDeParticipacion } from "@/server/domain/puntos";
import { obtenerJuntada } from "@/server/services/juntadas";
import { accederAlGrupo, CLASE_PAGINA, Esqueleto, oNulo, SinAcceso, Volver } from "../../acceso";
import { ControlesDeJuntada } from "./controles";

const TEXTO_DE_ESTADO: Record<EstadoDeParticipacion, string> = {
  asistio: "Fue",
  ausente_confirmado: "Faltó",
  no_invitado: "No invitado",
  sin_dato: "Sin dato de asistencia",
};

export default function PaginaJuntada({
  params,
  searchParams,
}: PageProps<"/grupos/[grupoId]/juntadas/[juntadaId]">) {
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
  params: Promise<{ grupoId: string; juntadaId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { grupoId, juntadaId } = await params;
  const recienCreada = (await searchParams).nueva === "1";
  const acceso = await accederAlGrupo(grupoId);
  if (!acceso) return <SinAcceso />;
  const { usuario, grupo } = acceso;

  const juntada = esIdValido(juntadaId)
    ? await oNulo(() => obtenerJuntada(usuario.id, grupo.id, juntadaId))
    : null;
  if (!juntada) return <SinAcceso mensaje="Esa juntada no existe en este grupo." />;

  return (
    <div className="space-y-8">
      {recienCreada && <Confeti fijo />}
      <Volver href={`/grupos/${grupo.id}`} texto={grupo.nombre} />

      {recienCreada && (
        <p role="status" className="aparece rounded-2xl bg-amarillo px-4 py-3 font-semibold text-violeta-oscuro">
          ¡Juntada registrada! Ya suma en la tabla.
        </p>
      )}

      <div className="aparece space-y-2">
        <p className="text-sm font-medium text-amarillo first-letter:uppercase">
          {fechaLarga(juntada.fecha)}
        </p>
        <h1 className="titulo-sticker font-display text-5xl leading-none tracking-wide break-words">
          {juntada.titulo ?? "Juntada"}
        </h1>
        {juntada.cancelada && (
          <p className="inline-block rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
            Cancelada: no suma puntos
          </p>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">Puntos</h2>
        <ul className="space-y-2">
          {juntada.personas.map((persona, indice) => (
            <li key={persona.integranteId} className="aparece space-y-2 rounded-2xl bg-card p-3 relieve" style={{ animationDelay: `${0.1 + indice * 0.06}s` }}>
              <div className="flex items-center gap-3">
                <Avatar
                  nombre={persona.nombre}
                  fotoUrl={persona.fotoUrl}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-heading truncate font-medium">{persona.nombre}</p>
                  <p className="text-xs text-muted-foreground">{TEXTO_DE_ESTADO[persona.estado]}</p>
                </div>
                {!juntada.cancelada && (
                  <span
                    className={`font-heading text-xl font-bold tabular-nums ${persona.puntos < 0 ? "text-naranja" : "text-amarillo"}`}
                  >
                    {conSigno(persona.puntos)}
                  </span>
                )}
              </div>
              {!juntada.cancelada && persona.motivos.length > 0 && (
                <ul className="flex flex-wrap gap-1.5 pl-12">
                  {persona.motivos.map((motivo, indice) => (
                    <li
                      key={indice}
                      className="rounded-full bg-muted/60 px-2.5 py-0.5 text-xs text-muted-foreground"
                    >
                      {motivo.motivo} {conSigno(motivo.puntos)}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>

      {(juntada.invitadosExternos || juntada.notas) && (
        <section className="space-y-3 text-sm">
          {juntada.invitadosExternos && (
            <p>
              <span className="text-muted-foreground">Invitados de afuera: </span>
              {juntada.invitadosExternos}
            </p>
          )}
          {juntada.notas && <p className="whitespace-pre-line">{juntada.notas}</p>}
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Cargada por {juntada.creadoPor ?? "alguien que ya no está"}
      </p>

      {juntada.puedeEditar ? (
        <div className="space-y-4 border-t border-border pt-6">
          <Link
            href={`/grupos/${grupo.id}/juntadas/${juntada.id}/editar`}
            className={buttonVariants({ size: "lg", className: "w-full" })}
          >
            Editar juntada
          </Link>
          <ControlesDeJuntada
            grupoId={grupo.id}
            juntadaId={juntada.id}
            cancelada={juntada.cancelada}
          />
        </div>
      ) : (
        <p className="border-t border-border pt-6 text-sm text-muted-foreground">
          Pasaron más de 48 horas desde que se cargó: solo un administrador la puede cambiar.
        </p>
      )}
    </div>
  );
}
