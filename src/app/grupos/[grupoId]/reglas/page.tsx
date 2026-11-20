import type { Metadata } from "next";
import { Suspense } from "react";
import { conSigno } from "@/lib/fechas";
import {
  type AccionConfigurable,
  listarAccionesConfigurables,
} from "@/server/services/configuracion-acciones";
import { accederAlGrupo, CLASE_PAGINA, Esqueleto, SinAcceso, Volver } from "../acceso";
import { EditarAccion, NuevaAccion } from "./controles";

export const metadata: Metadata = { title: "Reglas y puntos · Liga de Amigos" };

export default function PaginaReglas({ params }: PageProps<"/grupos/[grupoId]/reglas">) {
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
  const esAdmin = grupo.miRol === "admin";

  const acciones = await listarAccionesConfigurables(usuario.id, grupo.id);
  const activas = acciones.filter((a) => !a.archivada);
  const automaticas = activas.filter((a) => a.clave);
  const suman = activas.filter((a) => !a.clave && a.puntosHoy >= 0);
  const restan = activas.filter((a) => !a.clave && a.puntosHoy < 0);
  const archivadas = acciones.filter((a) => a.archivada);

  return (
    <div className="space-y-8">
      <Volver href={`/grupos/${grupo.id}`} texto={grupo.nombre} />
      <div className="space-y-2">
        <h1 className="font-display text-5xl tracking-wide">Reglas y puntos</h1>
        <p className="text-muted-foreground">
          {esAdmin
            ? "Cambiá los puntos o sumá acciones propias del grupo. Los cambios de puntos rigen desde hoy: lo ya cargado conserva su valor."
            : "Lo que suma y lo que resta en este grupo. Solo los administradores lo pueden cambiar."}
        </p>
      </div>

      <Seccion titulo="Automáticas" ayuda="Se aplican solas según la asistencia de cada juntada." acciones={automaticas} grupoId={grupo.id} esAdmin={esAdmin} />
      <Seccion titulo="Suman" acciones={suman} grupoId={grupo.id} esAdmin={esAdmin} />
      <Seccion titulo="Restan" acciones={restan} grupoId={grupo.id} esAdmin={esAdmin} />

      {esAdmin && <NuevaAccion grupoId={grupo.id} />}

      {archivadas.length > 0 && (
        <Seccion
          titulo="Archivadas"
          ayuda="Ya no se pueden usar en cargas nuevas. Los puntos que dieron siguen contando."
          acciones={archivadas}
          grupoId={grupo.id}
          esAdmin={esAdmin}
        />
      )}
    </div>
  );
}

function Seccion({
  titulo,
  ayuda,
  acciones,
  grupoId,
  esAdmin,
}: {
  titulo: string;
  ayuda?: string;
  acciones: AccionConfigurable[];
  grupoId: string;
  esAdmin: boolean;
}) {
  if (acciones.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-heading text-lg font-semibold">{titulo}</h2>
        {ayuda && <p className="text-sm text-muted-foreground">{ayuda}</p>}
      </div>
      <ul className="space-y-2">
        {acciones.map((accion) => (
          <li
            key={accion.id}
            className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-card p-3 ${accion.archivada ? "opacity-70" : ""}`}
          >
            <div className="min-w-0 flex-1">
              <p className="font-heading font-medium">{accion.nombre}</p>
              <p className="text-xs text-muted-foreground">
                {accion.usos === 0
                  ? "Todavía no se usó"
                  : `Se usó ${accion.usos} ${accion.usos === 1 ? "vez" : "veces"}`}
              </p>
            </div>
            <span
              className={`font-heading text-xl font-bold tabular-nums ${accion.puntosHoy < 0 ? "text-naranja" : "text-amarillo"}`}
            >
              {conSigno(accion.puntosHoy)}
            </span>
            {esAdmin && <EditarAccion grupoId={grupoId} accion={accion} />}
          </li>
        ))}
      </ul>
    </section>
  );
}
