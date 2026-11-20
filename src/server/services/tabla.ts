import "server-only";
import { sql } from "@/server/db";
import { hoy } from "@/server/domain/fechas";
import {
  armarTabla,
  cambiosDePosicion,
  type FilaDeTabla,
  fechaDeCorteParaComparar,
  porcentajeDeAsistencia,
  type RegistroParaTabla,
} from "@/server/domain/tabla";
import { exigirIntegrante } from "@/server/services/permisos";
import { elegirTemporada, type TemporadaElegida } from "@/server/services/temporadas";

export type FilaDeLaLiga = FilaDeTabla & {
  avatarEmoji: string | null;
  avatarColor: string | null;
  activo: boolean; // false = ya no está en el grupo (sigue en la tabla por sus puntos)
  faltas: number;
  porcentajeDeAsistencia: number | null;
  /** Puestos que subió (+) o bajó (−) desde la fecha de comparación; null si no hay. */
  cambio: number | null;
};

/** La tabla en sí, igual para todos los integrantes (es lo que se congela al cerrar). */
export type TablaCalculada = {
  anio: number;
  cerrada: boolean;
  juntadas: number; // juntadas de la temporada (sin contar canceladas)
  comparadoCon: string | null; // fecha de corte de la comparación (AAAA-MM-DD)
  acciones: Record<string, string>; // accionId → nombre, para el desglose
  filas: FilaDeLaLiga[];
};

export type TablaDeLaLiga = TablaCalculada & {
  temporadas: number[]; // años disponibles, del más nuevo al más viejo
  miIntegranteId: string;
};

/**
 * Tabla de una temporada (por defecto la del año actual). Si la temporada
 * está cerrada, se muestra la foto guardada al cerrarla.
 */
export async function obtenerTabla(
  usuarioId: string,
  grupoId: string,
  anioPedido?: number,
): Promise<TablaDeLaLiga> {
  const membresia = await exigirIntegrante(usuarioId, grupoId);
  const { temporada, anios } = await elegirTemporada(grupoId, anioPedido);

  const congelada = temporada.cerrada ? await tablaCongelada(temporada.id) : null;
  const tabla = congelada ?? (await calcularTabla(grupoId, temporada));

  return { ...tabla, temporadas: anios, miIntegranteId: membresia.integranteId };
}

async function tablaCongelada(temporadaId: string): Promise<TablaCalculada | null> {
  const [cierre] = await sql<{ tabla: TablaCalculada }[]>`
    SELECT tabla FROM cierres_temporada WHERE temporada_id = ${temporadaId}
  `;
  return cierre?.tabla ?? null;
}

/** Arma la tabla a partir de los registros de puntos: no hay ningún total guardado. */
export async function calcularTabla(
  grupoId: string,
  temporada: TemporadaElegida,
): Promise<TablaCalculada> {
  const [registros, integrantes, asistencia, [{ juntadas }], acciones] = await Promise.all([
    sql<(RegistroParaTabla & { fecha: string })[]>`
      SELECT r.integrante_id AS "integranteId", r.accion_id AS "accionId", a.clave,
             r.puntos, r.fecha::text AS fecha
      FROM registros_puntos r
      JOIN acciones a ON a.id = r.accion_id
      WHERE r.grupo_id = ${grupoId} AND r.temporada_id = ${temporada.id}
    `,
    integrantesDeLaTemporada(grupoId, temporada.id),
    // Asistencia sale de las participaciones (no de los puntos): así cuenta
    // aunque el grupo haya cambiado o archivado la acción de faltar.
    sql<{ integranteId: string; fue: number; falto: number }[]>`
      SELECT p.integrante_id AS "integranteId",
             count(*) FILTER (WHERE p.estado = 'asistio')::int AS fue,
             count(*) FILTER (WHERE p.estado = 'ausente_confirmado')::int AS falto
      FROM participaciones p
      JOIN juntadas j ON j.id = p.juntada_id
      WHERE j.temporada_id = ${temporada.id} AND j.cancelada_en IS NULL
      GROUP BY p.integrante_id
    `,
    sql<{ juntadas: number }[]>`
      SELECT count(*)::int AS juntadas FROM juntadas
      WHERE temporada_id = ${temporada.id} AND cancelada_en IS NULL
    `,
    sql<{ id: string; nombre: string }[]>`
      SELECT id, nombre FROM acciones WHERE grupo_id = ${grupoId}
    `,
  ]);

  const tabla = armarTabla(integrantes, registros);

  // Comparación con la tabla al cierre del mes anterior.
  const corte = fechaDeCorteParaComparar(temporada.anio, hoy());
  let cambios: Record<string, number> | null = null;
  if (corte) {
    const anteriores = registros.filter((r) => r.fecha < corte);
    cambios = cambiosDePosicion(tabla, armarTabla(integrantes, anteriores), anteriores.length > 0);
  }

  const porId = new Map(integrantes.map((i) => [i.id, i]));
  const filas: FilaDeLaLiga[] = tabla.map((fila) => {
    const integrante = porId.get(fila.integranteId)!;
    const suAsistencia = asistencia.find((a) => a.integranteId === fila.integranteId);
    return {
      ...fila,
      avatarEmoji: integrante.avatarEmoji,
      avatarColor: integrante.avatarColor,
      activo: integrante.activo,
      faltas: suAsistencia?.falto ?? 0,
      porcentajeDeAsistencia: porcentajeDeAsistencia(suAsistencia?.fue ?? 0, suAsistencia?.falto ?? 0),
      cambio: cambios ? (cambios[fila.integranteId] ?? null) : null,
    };
  });

  return {
    anio: temporada.anio,
    cerrada: temporada.cerrada,
    juntadas,
    comparadoCon: cambios ? corte : null,
    acciones: Object.fromEntries(acciones.map((a) => [a.id, a.nombre])),
    filas,
  };
}

export type IntegranteDeTemporada = {
  id: string;
  nombre: string;
  avatarEmoji: string | null;
  avatarColor: string | null;
  activo: boolean;
};

/** Activos, más quienes se fueron pero tienen puntos o asistencia en la temporada. */
export function integrantesDeLaTemporada(grupoId: string, temporadaId: string) {
  return sql<IntegranteDeTemporada[]>`
    SELECT i.id, i.nombre, u.avatar_emoji AS "avatarEmoji", u.avatar_color AS "avatarColor",
           i.egreso_en IS NULL AS activo
    FROM integrantes i
    LEFT JOIN usuarios u ON u.id = i.usuario_id
    WHERE i.grupo_id = ${grupoId}
      AND (
        i.egreso_en IS NULL
        OR EXISTS (SELECT 1 FROM registros_puntos r
                   WHERE r.integrante_id = i.id AND r.temporada_id = ${temporadaId})
        OR EXISTS (SELECT 1 FROM participaciones p JOIN juntadas j ON j.id = p.juntada_id
                   WHERE p.integrante_id = i.id AND j.temporada_id = ${temporadaId})
      )
  `;
}
