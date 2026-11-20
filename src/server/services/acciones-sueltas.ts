import "server-only";
import { sql } from "@/server/db";
import { ErrorDeDominio, ErrorSinPermiso } from "@/server/domain/errores";
import { type DatosAccionSuelta, puedeEditar } from "@/server/domain/juntadas";
import { calcularPuntosDeAccionSuelta } from "@/server/domain/puntos";
import { cargarAcciones } from "@/server/services/acciones";
import { registrarAuditoria } from "@/server/services/auditoria";
import { exigirIntegrante } from "@/server/services/permisos";
import { temporadaParaCargar, validarTemporadaEditable } from "@/server/services/temporadas";

export type AccionSueltaVista = {
  id: string;
  fecha: string;
  integrante: string;
  accion: string;
  puntos: number;
  nota: string | null;
  creadoPor: string | null;
  puedeEditar: boolean;
};

/** Puntos fuera de una juntada ("se acordó del cumpleaños de Juli"). */
export async function crearAccionSuelta(
  usuarioId: string,
  grupoId: string,
  datos: DatosAccionSuelta,
): Promise<{ id: string }> {
  const membresia = await exigirIntegrante(usuarioId, grupoId);

  return sql.begin(async (tx) => {
    const temporadaId = await temporadaParaCargar(tx, grupoId, datos.fecha);

    const [integrante] = await tx`
      SELECT 1 FROM integrantes
      WHERE id = ${datos.integranteId} AND grupo_id = ${grupoId} AND egreso_en IS NULL
    `;
    if (!integrante) {
      throw new ErrorDeDominio("Esa persona no está en el grupo");
    }

    const acciones = await cargarAcciones(tx, grupoId);
    const accion = acciones.find((a) => a.id === datos.accionId);
    if (accion?.archivada) {
      throw new ErrorDeDominio(`"${accion.nombre}" está archivada y no se puede usar`);
    }
    // Valida que la acción sea del grupo y no sea asistir/faltar.
    const registro = calcularPuntosDeAccionSuelta(datos, acciones);

    const [suelta] = await tx<{ id: string }[]>`
      INSERT INTO acciones_registradas
        (grupo_id, temporada_id, integrante_id, accion_id, fecha, nota, creado_por)
      VALUES (${grupoId}, ${temporadaId}, ${datos.integranteId}, ${datos.accionId},
              ${datos.fecha}, ${datos.nota}, ${membresia.integranteId})
      RETURNING id
    `;
    await tx`
      INSERT INTO registros_puntos
        (grupo_id, temporada_id, integrante_id, accion_id, accion_registrada_id, fecha, puntos, motivo)
      VALUES (${grupoId}, ${temporadaId}, ${registro.integranteId}, ${registro.accionId},
              ${suelta.id}, ${datos.fecha}, ${registro.puntos}, ${registro.motivo})
    `;

    await registrarAuditoria(tx, {
      grupoId,
      usuarioId,
      accion: "accion_suelta.crear",
      entidad: "accion_registrada",
      entidadId: suelta.id,
      datos: { integranteId: datos.integranteId, accion: registro.motivo, puntos: registro.puntos },
    });
    return suelta;
  });
}

export async function eliminarAccionSuelta(
  usuarioId: string,
  grupoId: string,
  sueltaId: string,
): Promise<void> {
  const membresia = await exigirIntegrante(usuarioId, grupoId);

  await sql.begin(async (tx) => {
    const [suelta] = await tx<{ fecha: string; temporadaId: string; creadoEn: Date }[]>`
      SELECT fecha::text AS fecha, temporada_id AS "temporadaId", creado_en AS "creadoEn"
      FROM acciones_registradas
      WHERE id = ${sueltaId} AND grupo_id = ${grupoId} AND juntada_id IS NULL
      FOR UPDATE
    `;
    if (!suelta) {
      throw new ErrorDeDominio("Ese registro no existe en este grupo");
    }
    if (!puedeEditar(membresia.rol, suelta.creadoEn, new Date())) {
      throw new ErrorSinPermiso(
        "Pasaron más de 48 horas desde que se cargó: solo un administrador lo puede borrar",
      );
    }
    await validarTemporadaEditable(tx, suelta.temporadaId, suelta.fecha);

    // Su registro de puntos se borra solo (ON DELETE CASCADE).
    await tx`DELETE FROM acciones_registradas WHERE id = ${sueltaId}`;
    await registrarAuditoria(tx, {
      grupoId,
      usuarioId,
      accion: "accion_suelta.eliminar",
      entidad: "accion_registrada",
      entidadId: sueltaId,
    });
  });
}

export async function listarAccionesSueltas(
  usuarioId: string,
  grupoId: string,
  limite = 50,
): Promise<AccionSueltaVista[]> {
  const membresia = await exigirIntegrante(usuarioId, grupoId);

  const filas = await sql<(Omit<AccionSueltaVista, "puedeEditar"> & { creadoEn: Date })[]>`
    SELECT s.id, s.fecha::text AS fecha, i.nombre AS integrante, a.nombre AS accion,
           r.puntos, s.nota, c.nombre AS "creadoPor", s.creado_en AS "creadoEn"
    FROM acciones_registradas s
    JOIN integrantes i ON i.id = s.integrante_id
    JOIN acciones a ON a.id = s.accion_id
    JOIN registros_puntos r ON r.accion_registrada_id = s.id
    LEFT JOIN integrantes c ON c.id = s.creado_por
    WHERE s.grupo_id = ${grupoId} AND s.juntada_id IS NULL
    ORDER BY s.fecha DESC, s.creado_en DESC
    LIMIT ${limite}
  `;

  const ahora = new Date();
  return filas.map(({ creadoEn, ...fila }) => ({
    ...fila,
    puedeEditar: puedeEditar(membresia.rol, creadoEn, ahora),
  }));
}
