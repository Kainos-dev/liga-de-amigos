import type { Metadata } from "next";
import { Suspense } from "react";
import { conSigno, fechaCorta } from "@/lib/fechas";
import { hoy } from "@/server/domain/fechas";
import { listarAccionesSueltas } from "@/server/services/acciones-sueltas";
import { accionesParaFormulario } from "@/server/services/acciones";
import { accederAlGrupo, CLASE_PAGINA, Esqueleto, SinAcceso, Volver } from "../acceso";
import { BorrarAccionSuelta, FormularioAccionSuelta } from "./controles";

export const metadata: Metadata = { title: "Puntos sueltos · Liga de Amigos" };

export default function PaginaPuntosSueltos({
  params,
}: PageProps<"/grupos/[grupoId]/puntos-sueltos">) {
  return (
    <main className={CLASE_PAGINA}>
      <Suspense fallback={<Esqueleto />}>
        <Contenido params={params} />
      </Suspense>
    </main>
  );
}

async function Contenido({ params }: { params: Promise<{ grupoId: string }> }) {
  const acceso = await accederAlGrupo((await params).grupoId);
  if (!acceso) return <SinAcceso />;
  const { usuario, grupo } = acceso;

  const [acciones, sueltas] = await Promise.all([
    accionesParaFormulario(usuario.id, grupo.id),
    listarAccionesSueltas(usuario.id, grupo.id),
  ]);
  // Asistir y Faltar solo existen dentro de una juntada.
  const accionesSueltas = acciones
    .filter((a) => !a.clave)
    .map((a) => ({ id: a.id, nombre: a.nombre, puntosHoy: a.puntosHoy }));
  const integrantes = grupo.integrantes.map((i) => ({ id: i.id, nombre: i.nombre }));

  return (
    <div className="space-y-8">
      <Volver href={`/grupos/${grupo.id}`} texto={grupo.nombre} />
      <div className="space-y-2">
        <h1 className="font-display text-5xl tracking-wide">Puntos sueltos</h1>
        <p className="text-muted-foreground">
          Para lo que pasa fuera de una juntada: se acordó de un cumple, puso para el regalo…
        </p>
      </div>

      <FormularioAccionSuelta
        grupoId={grupo.id}
        integrantes={integrantes}
        acciones={accionesSueltas}
        hoy={hoy()}
      />

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">Últimos cargados</h2>
        {sueltas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no se cargaron puntos sueltos.</p>
        ) : (
          <ul className="space-y-2">
            {sueltas.map((suelta) => (
              <li key={suelta.id} className="flex items-start gap-3 rounded-xl bg-card p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-heading font-medium">
                    {suelta.integrante} · {suelta.accion}
                  </p>
                  {suelta.nota && <p className="text-sm">{suelta.nota}</p>}
                  <p className="text-xs text-muted-foreground first-letter:uppercase">
                    {fechaCorta(suelta.fecha)} · cargado por {suelta.creadoPor ?? "alguien que ya no está"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`font-heading text-lg font-bold tabular-nums ${suelta.puntos < 0 ? "text-naranja" : "text-amarillo"}`}
                  >
                    {conSigno(suelta.puntos)}
                  </span>
                  {suelta.puedeEditar && <BorrarAccionSuelta grupoId={grupo.id} sueltaId={suelta.id} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
