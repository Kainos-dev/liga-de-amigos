import "server-only";
import { sql } from "@/server/db";
import { type ClaveSistema, puntosVigentes } from "@/server/domain/acciones";
import { type CambiosDeAccion, validarArchivado } from "@/server/domain/configuracion-acciones";
import { ErrorDeDominio } from "@/server/domain/errores";
import { hoy } from "@/server/domain/fechas";
import { cargarAcciones } from "@/server/services/acciones";
import { registrarAuditoria } from "@/server/services/auditoria";
import { exigirAdmin, exigirIntegrante } from "@/server/services/permisos";

export type AccionConfigurable = {
  id: string;
  nombre: string;
  clave: ClaveSistema | null;
  archivada: boolean;
  puntosHoy: number;
  usos: number; // cuántos registros de puntos generó (en todas las temporadas)
};

const MENSAJE_NOMBRE_REPETIDO = "Ya hay una acción activa con ese nombre";

/** Todas las acciones (también archivadas), para la pantalla de reglas. */
export async function listarAccionesConfigurables(
  usuarioId: string,
  grupoId: string,
): Promise<AccionConfigurable[]> {
  await exigirIntegrante(usuarioId, grupoId);
  const fecha = hoy();

  const [acciones, usos] = await Promise.all([
    cargarAcciones(sql, grupoId),
    sql<{ accionId: string; usos: number }[]>`
      SELECT accion_id AS "accionId", count(*)::int AS usos
      FROM registros_puntos WHERE grupo_id = ${grupoId}
      GROUP BY accion_id
    `,
  ]);

  return acciones.map((accion) => ({
    id: accion.id,
    nombre: accion.nombre,
    clave: accion.clave,
    archivada: accion.archivada,
    puntosHoy: puntosVigentes(accion.historialDePuntos, fecha),
    usos: usos.find((u) => u.accionId === accion.id)?.usos ?? 0,
  }));
}

export async function crearAccion(
  usuarioId: string,
  grupoId: string,
  datos: { nombre: string; puntos: number },
): Promise<{ id: string }> {
  await exigirAdmin(usuarioId, grupoId);

  try {
    return await sql.begin(async (tx) => {
      const [accion] = await tx<{ id: string }[]>`
        INSERT INTO acciones (grupo_id, nombre) VALUES (${grupoId}, ${datos.nombre})
        RETURNING id
      `;
      // Vigente desde hoy; si se usa en una juntada anterior, vale lo mismo
      // (antes del primer valor se usa el primer valor).
      await tx`
        INSERT INTO acciones_puntos (accion_id, puntos, vigente_desde)
        VALUES (${accion.id}, ${datos.puntos}, ${hoy()})
      `;
      await registrarAuditoria(tx, {
        grupoId,
        usuarioId,
        accion: "accion.crear",
        entidad: "accion",
        entidadId: accion.id,
        datos: { nombre: datos.nombre, puntos: datos.puntos },
      });
      return accion;
    });
  } catch (error) {
    if (esNombreRepetido(error)) throw new ErrorDeDominio(MENSAJE_NOMBRE_REPETIDO);
    throw error;
  }
}

/**
 * Cambiar nombre, puntos o archivado de una acción.
 *
 * Los puntos nuevos rigen desde hoy: se agrega un valor "vigente desde hoy"
 * y lo cargado antes conserva el suyo. Lo que ya esté cargado con fecha de
 * hoy se actualiza al valor nuevo, para que todo lo de hoy valga lo mismo.
 */
export async function editarAccion(
  usuarioId: string,
  grupoId: string,
  accionId: string,
  cambios: CambiosDeAccion,
): Promise<void> {
  await exigirAdmin(usuarioId, grupoId);
  const fecha = hoy();

  try {
    await sql.begin(async (tx) => {
      const [accion] = await tx<{ nombre: string; clave: ClaveSistema | null; archivada: boolean }[]>`
        SELECT nombre, clave, archivada_en IS NOT NULL AS archivada
        FROM acciones WHERE id = ${accionId} AND grupo_id = ${grupoId}
        FOR UPDATE
      `;
      if (!accion) {
        throw new ErrorDeDominio("Esa acción no existe en este grupo");
      }
      const anterior: Record<string, string | number | boolean | null> = {};

      if (cambios.nombre !== undefined && cambios.nombre !== accion.nombre) {
        await tx`UPDATE acciones SET nombre = ${cambios.nombre} WHERE id = ${accionId}`;
        // El motivo de los puntos ya cargados también pasa a decir el nombre nuevo,
        // para que la tabla y el detalle de las juntadas coincidan.
        await tx`UPDATE registros_puntos SET motivo = ${cambios.nombre} WHERE accion_id = ${accionId}`;
        anterior.nombreAnterior = accion.nombre;
      }

      if (cambios.puntos !== undefined) {
        const historial = (await cargarAcciones(tx, grupoId)).find((a) => a.id === accionId)!
          .historialDePuntos;
        const actuales = puntosVigentes(historial, fecha);

        if (cambios.puntos !== actuales) {
          // Si ya se cambió hoy, se pisa ese valor (uno por día alcanza).
          await tx`
            INSERT INTO acciones_puntos (accion_id, puntos, vigente_desde)
            VALUES (${accionId}, ${cambios.puntos}, ${fecha})
            ON CONFLICT (accion_id, vigente_desde) DO UPDATE SET puntos = EXCLUDED.puntos
          `;
          // Lo cargado con fecha de hoy pasa al valor nuevo (no hay fechas futuras).
          await tx`
            UPDATE registros_puntos SET puntos = ${cambios.puntos}
            WHERE accion_id = ${accionId} AND fecha >= ${fecha}
          `;
          anterior.puntosAnteriores = actuales;
        }
      }

      if (cambios.archivada !== undefined && cambios.archivada !== accion.archivada) {
        if (cambios.archivada) validarArchivado(accion.clave);
        await tx`
          UPDATE acciones SET archivada_en = ${cambios.archivada ? new Date() : null}
          WHERE id = ${accionId}
        `;
      }

      await registrarAuditoria(tx, {
        grupoId,
        usuarioId,
        accion: "accion.editar",
        entidad: "accion",
        entidadId: accionId,
        datos: {
          ...anterior,
          nombre: cambios.nombre ?? null,
          puntos: cambios.puntos ?? null,
          archivada: cambios.archivada ?? null,
        },
      });
    });
  } catch (error) {
    if (esNombreRepetido(error)) throw new ErrorDeDominio(MENSAJE_NOMBRE_REPETIDO);
    throw error;
  }
}

/** ¿Choca con el índice de nombres únicos entre acciones activas? */
function esNombreRepetido(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "constraint_name" in error &&
    error.constraint_name === "acciones_nombre_activo_unico"
  );
}
