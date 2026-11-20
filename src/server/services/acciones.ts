import "server-only";
import type { Sql, TransactionSql } from "postgres";
import { sql } from "@/server/db";
import { type Accion, type ClaveSistema, puntosVigentes } from "@/server/domain/acciones";
import { hoy } from "@/server/domain/fechas";
import { exigirIntegrante } from "@/server/services/permisos";

export type AccionDelGrupo = Accion & { archivada: boolean };

/** Todas las acciones del grupo (también archivadas) con su historial de puntos. */
export async function cargarAcciones(
  db: Sql | TransactionSql,
  grupoId: string,
): Promise<AccionDelGrupo[]> {
  const filas = await db<
    { id: string; clave: ClaveSistema | null; nombre: string; archivada: boolean; puntos: number; vigenteDesde: string }[]
  >`
    SELECT a.id, a.clave, a.nombre, a.archivada_en IS NOT NULL AS archivada,
           p.puntos, p.vigente_desde::text AS "vigenteDesde"
    FROM acciones a
    JOIN acciones_puntos p ON p.accion_id = a.id
    WHERE a.grupo_id = ${grupoId}
    ORDER BY a.creado_en, p.vigente_desde
  `;

  // Una fila por cada valor histórico: las agrupamos por acción.
  const porId = new Map<string, AccionDelGrupo>();
  for (const fila of filas) {
    let accion = porId.get(fila.id);
    if (!accion) {
      accion = {
        id: fila.id,
        clave: fila.clave,
        nombre: fila.nombre,
        archivada: fila.archivada,
        historialDePuntos: [],
      };
      porId.set(fila.id, accion);
    }
    accion.historialDePuntos.push({ puntos: fila.puntos, vigenteDesde: fila.vigenteDesde });
  }
  return [...porId.values()];
}

export type AccionParaFormulario = AccionDelGrupo & { puntosHoy: number };

/** Acciones activas, para mostrar en los formularios (con los puntos de hoy). */
export async function accionesParaFormulario(
  usuarioId: string,
  grupoId: string,
): Promise<AccionParaFormulario[]> {
  await exigirIntegrante(usuarioId, grupoId);
  const fecha = hoy();
  return (await cargarAcciones(sql, grupoId))
    .filter((accion) => !accion.archivada)
    .map((accion) => ({ ...accion, puntosHoy: puntosVigentes(accion.historialDePuntos, fecha) }));
}
