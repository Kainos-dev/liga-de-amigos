import "server-only";
import type { TransactionSql } from "postgres";
import { sql } from "@/server/db";
import { ErrorDeDominio, ErrorSinPermiso } from "@/server/domain/errores";
import type { Rol } from "@/server/domain/grupos";
import {
  type DatosJuntada,
  participacionesAGuardar,
  puedeEditar,
} from "@/server/domain/juntadas";
import { calcularPuntosDeJuntada, type EstadoDeParticipacion } from "@/server/domain/puntos";
import { type AccionParaFormulario, accionesParaFormulario, cargarAcciones } from "@/server/services/acciones";
import { registrarAuditoria } from "@/server/services/auditoria";
import { exigirIntegrante } from "@/server/services/permisos";
import { temporadaParaCargar, validarTemporadaEditable } from "@/server/services/temporadas";

// ─── Tipos que devuelven las consultas ────────────────────────────────────────

export type ResumenDeJuntada = {
  id: string;
  fecha: string; // AAAA-MM-DD
  titulo: string | null;
  cancelada: boolean;
  asistentes: number;
};

export type PersonaEnJuntada = {
  integranteId: string;
  nombre: string;
  avatarEmoji: string | null;
  avatarColor: string | null;
  estado: EstadoDeParticipacion;
  puntos: number;
  motivos: { motivo: string; puntos: number }[];
};

export type DetalleDeJuntada = {
  id: string;
  fecha: string;
  titulo: string | null;
  notas: string | null;
  invitadosExternos: string | null;
  cancelada: boolean;
  creadoPor: string | null; // nombre de quien la cargó
  creadoEn: Date;
  puedeEditar: boolean;
  personas: PersonaEnJuntada[];
  /** Lo cargado tal cual, para precargar el formulario de edición. */
  participaciones: { integranteId: string; estado: EstadoDeParticipacion }[];
  acciones: { integranteId: string; accionId: string }[];
};

export type IntegranteParaFormulario = {
  id: string;
  nombre: string;
  avatarEmoji: string | null;
  avatarColor: string | null;
};

// ─── Escrituras ──────────────────────────────────────────────────────────────

export async function crearJuntada(
  usuarioId: string,
  grupoId: string,
  datos: DatosJuntada,
): Promise<{ id: string }> {
  const membresia = await exigirIntegrante(usuarioId, grupoId);

  return sql.begin(async (tx) => {
    const temporadaId = await temporadaParaCargar(tx, grupoId, datos.fecha);

    const [juntada] = await tx<{ id: string }[]>`
      INSERT INTO juntadas (grupo_id, temporada_id, fecha, titulo, notas, invitados_externos, creado_por)
      VALUES (${grupoId}, ${temporadaId}, ${datos.fecha}, ${datos.titulo}, ${datos.notas},
              ${datos.invitadosExternos}, ${membresia.integranteId})
      RETURNING id
    `;

    await guardarAsistenciaYAcciones(tx, {
      grupoId,
      juntadaId: juntada.id,
      temporadaId,
      creadoPor: membresia.integranteId,
      datos,
      previos: { integrantes: new Set(), acciones: new Set() },
    });
    await recalcularPuntosDeJuntada(tx, juntada.id);

    await registrarAuditoria(tx, {
      grupoId,
      usuarioId,
      accion: "juntada.crear",
      entidad: "juntada",
      entidadId: juntada.id,
      datos: { fecha: datos.fecha },
    });
    return juntada;
  });
}

/**
 * Editar reemplaza todo el contenido de la juntada: se borran su asistencia,
 * sus acciones y sus puntos, y se vuelven a cargar. Todo en una transacción,
 * así nunca quedan puntos duplicados ni a medio calcular.
 */
export async function editarJuntada(
  usuarioId: string,
  grupoId: string,
  juntadaId: string,
  datos: DatosJuntada,
): Promise<void> {
  const membresia = await exigirIntegrante(usuarioId, grupoId);

  await sql.begin(async (tx) => {
    const anterior = await exigirJuntadaEditable(tx, membresia.rol, grupoId, juntadaId);
    const temporadaId = await temporadaParaCargar(tx, grupoId, datos.fecha);

    // Lo que ya estaba cargado se puede mantener aunque la persona se haya ido
    // del grupo o la acción se haya archivado después.
    const integrantesPrevios = await tx<{ id: string }[]>`
      SELECT integrante_id AS id FROM participaciones WHERE juntada_id = ${juntadaId}
      UNION
      SELECT integrante_id FROM acciones_registradas WHERE juntada_id = ${juntadaId}
    `;
    const accionesPrevias = await tx<{ id: string }[]>`
      SELECT DISTINCT accion_id AS id FROM acciones_registradas WHERE juntada_id = ${juntadaId}
    `;

    await tx`DELETE FROM registros_puntos WHERE juntada_id = ${juntadaId}`;
    await tx`DELETE FROM acciones_registradas WHERE juntada_id = ${juntadaId}`;
    await tx`DELETE FROM participaciones WHERE juntada_id = ${juntadaId}`;

    await tx`
      UPDATE juntadas
      SET fecha = ${datos.fecha}, temporada_id = ${temporadaId}, titulo = ${datos.titulo},
          notas = ${datos.notas}, invitados_externos = ${datos.invitadosExternos},
          actualizado_en = now()
      WHERE id = ${juntadaId}
    `;

    await guardarAsistenciaYAcciones(tx, {
      grupoId,
      juntadaId,
      temporadaId,
      creadoPor: membresia.integranteId,
      datos,
      previos: {
        integrantes: new Set(integrantesPrevios.map((f) => f.id)),
        acciones: new Set(accionesPrevias.map((f) => f.id)),
      },
    });
    await recalcularPuntosDeJuntada(tx, juntadaId);

    await registrarAuditoria(tx, {
      grupoId,
      usuarioId,
      accion: "juntada.editar",
      entidad: "juntada",
      entidadId: juntadaId,
      datos: { fechaAnterior: anterior.fecha, fecha: datos.fecha },
    });
  });
}

/** Cancelar (no suma puntos, pero queda en el historial) o reactivar. */
export async function cambiarCancelacion(
  usuarioId: string,
  grupoId: string,
  juntadaId: string,
  cancelada: boolean,
): Promise<void> {
  const membresia = await exigirIntegrante(usuarioId, grupoId);

  await sql.begin(async (tx) => {
    await exigirJuntadaEditable(tx, membresia.rol, grupoId, juntadaId);
    await tx`
      UPDATE juntadas
      SET cancelada_en = ${cancelada ? new Date() : null}, actualizado_en = now()
      WHERE id = ${juntadaId}
    `;
    await recalcularPuntosDeJuntada(tx, juntadaId);
    await registrarAuditoria(tx, {
      grupoId,
      usuarioId,
      accion: cancelada ? "juntada.cancelar" : "juntada.reactivar",
      entidad: "juntada",
      entidadId: juntadaId,
    });
  });
}

export async function eliminarJuntada(
  usuarioId: string,
  grupoId: string,
  juntadaId: string,
): Promise<void> {
  const membresia = await exigirIntegrante(usuarioId, grupoId);

  await sql.begin(async (tx) => {
    const juntada = await exigirJuntadaEditable(tx, membresia.rol, grupoId, juntadaId);
    // Asistencia, acciones y puntos se borran solos (ON DELETE CASCADE).
    await tx`DELETE FROM juntadas WHERE id = ${juntadaId}`;
    await registrarAuditoria(tx, {
      grupoId,
      usuarioId,
      accion: "juntada.eliminar",
      entidad: "juntada",
      entidadId: juntadaId,
      datos: { fecha: juntada.fecha, titulo: juntada.titulo },
    });
  });
}

// ─── Lecturas ────────────────────────────────────────────────────────────────

export async function listarJuntadas(
  usuarioId: string,
  grupoId: string,
  limite = 50,
): Promise<ResumenDeJuntada[]> {
  await exigirIntegrante(usuarioId, grupoId);
  return sql<ResumenDeJuntada[]>`
    SELECT j.id, j.fecha::text AS fecha, j.titulo,
           j.cancelada_en IS NOT NULL AS cancelada,
           (SELECT count(*)::int FROM participaciones p
             WHERE p.juntada_id = j.id AND p.estado = 'asistio') AS asistentes
    FROM juntadas j
    WHERE j.grupo_id = ${grupoId}
    ORDER BY j.fecha DESC, j.creado_en DESC
    LIMIT ${limite}
  `;
}

export async function obtenerJuntada(
  usuarioId: string,
  grupoId: string,
  juntadaId: string,
): Promise<DetalleDeJuntada> {
  const membresia = await exigirIntegrante(usuarioId, grupoId);

  const [juntada] = await sql<
    Omit<DetalleDeJuntada, "puedeEditar" | "personas" | "participaciones" | "acciones">[]
  >`
    SELECT j.id, j.fecha::text AS fecha, j.titulo, j.notas,
           j.invitados_externos AS "invitadosExternos",
           j.cancelada_en IS NOT NULL AS cancelada,
           c.nombre AS "creadoPor", j.creado_en AS "creadoEn"
    FROM juntadas j
    LEFT JOIN integrantes c ON c.id = j.creado_por
    WHERE j.id = ${juntadaId} AND j.grupo_id = ${grupoId}
  `;
  if (!juntada) {
    throw new ErrorDeDominio("Esa juntada no existe en este grupo");
  }

  const [participaciones, acciones, registros] = await Promise.all([
    sql<{ integranteId: string; estado: EstadoDeParticipacion }[]>`
      SELECT integrante_id AS "integranteId", estado
      FROM participaciones WHERE juntada_id = ${juntadaId}
    `,
    sql<{ integranteId: string; accionId: string }[]>`
      SELECT integrante_id AS "integranteId", accion_id AS "accionId"
      FROM acciones_registradas WHERE juntada_id = ${juntadaId}
    `,
    sql<{ integranteId: string; motivo: string; puntos: number }[]>`
      SELECT integrante_id AS "integranteId", motivo, puntos
      FROM registros_puntos WHERE juntada_id = ${juntadaId}
      ORDER BY creado_en
    `,
  ]);

  // Todas las personas que aparecen en la juntada, con sus puntos.
  const ids = [...new Set([...participaciones, ...acciones].map((f) => f.integranteId))];
  const integrantes = ids.length
    ? await sql<IntegranteParaFormulario[]>`
        SELECT i.id, i.nombre, u.avatar_emoji AS "avatarEmoji", u.avatar_color AS "avatarColor"
        FROM integrantes i LEFT JOIN usuarios u ON u.id = i.usuario_id
        WHERE i.id IN ${sql(ids)}
      `
    : [];

  const personas: PersonaEnJuntada[] = integrantes.map((integrante) => {
    const suyos = registros.filter((r) => r.integranteId === integrante.id);
    return {
      integranteId: integrante.id,
      nombre: integrante.nombre,
      avatarEmoji: integrante.avatarEmoji,
      avatarColor: integrante.avatarColor,
      estado: participaciones.find((p) => p.integranteId === integrante.id)?.estado ?? "sin_dato",
      puntos: suyos.reduce((total, r) => total + r.puntos, 0),
      motivos: suyos.map((r) => ({ motivo: r.motivo, puntos: r.puntos })),
    };
  });
  personas.sort((a, b) => b.puntos - a.puntos || a.nombre.localeCompare(b.nombre, "es"));

  return {
    ...juntada,
    puedeEditar: puedeEditar(membresia.rol, juntada.creadoEn, new Date()),
    personas,
    participaciones,
    acciones,
  };
}

/**
 * Lo necesario para el formulario: integrantes activos (más los que ya estaban
 * en la juntada, si se está editando) y las acciones activas.
 */
export async function datosParaFormulario(
  usuarioId: string,
  grupoId: string,
  juntadaId?: string,
): Promise<{ integrantes: IntegranteParaFormulario[]; acciones: AccionParaFormulario[] }> {
  const acciones = await accionesParaFormulario(usuarioId, grupoId); // verifica membresía

  const integrantes = await sql<IntegranteParaFormulario[]>`
    SELECT i.id, i.nombre, u.avatar_emoji AS "avatarEmoji", u.avatar_color AS "avatarColor"
    FROM integrantes i LEFT JOIN usuarios u ON u.id = i.usuario_id
    WHERE i.grupo_id = ${grupoId}
      AND (
        i.egreso_en IS NULL
        OR i.id IN (SELECT integrante_id FROM participaciones WHERE juntada_id = ${juntadaId ?? null})
        OR i.id IN (SELECT integrante_id FROM acciones_registradas WHERE juntada_id = ${juntadaId ?? null})
      )
    ORDER BY lower(i.nombre)
  `;

  return { integrantes, acciones };
}

// ─── Internas ────────────────────────────────────────────────────────────────

/**
 * Bloquea la juntada (FOR UPDATE) y verifica que el usuario la pueda cambiar:
 * permiso por las 48 h y temporada todavía abierta.
 */
async function exigirJuntadaEditable(
  tx: TransactionSql,
  rol: Rol,
  grupoId: string,
  juntadaId: string,
): Promise<{ fecha: string; titulo: string | null }> {
  const [juntada] = await tx<
    { fecha: string; titulo: string | null; temporadaId: string; creadoEn: Date }[]
  >`
    SELECT fecha::text AS fecha, titulo, temporada_id AS "temporadaId", creado_en AS "creadoEn"
    FROM juntadas
    WHERE id = ${juntadaId} AND grupo_id = ${grupoId}
    FOR UPDATE
  `;
  if (!juntada) {
    throw new ErrorDeDominio("Esa juntada no existe en este grupo");
  }
  if (!puedeEditar(rol, juntada.creadoEn, new Date())) {
    throw new ErrorSinPermiso(
      "Pasaron más de 48 horas desde que se cargó: solo un administrador la puede cambiar",
    );
  }
  await validarTemporadaEditable(tx, juntada.temporadaId, juntada.fecha);
  return juntada;
}

/** Valida y guarda la asistencia y las acciones marcadas (sin los puntos). */
async function guardarAsistenciaYAcciones(
  tx: TransactionSql,
  entrada: {
    grupoId: string;
    juntadaId: string;
    temporadaId: string;
    creadoPor: string;
    datos: DatosJuntada;
    previos: { integrantes: Set<string>; acciones: Set<string> };
  },
): Promise<void> {
  const { grupoId, juntadaId, temporadaId, creadoPor, datos, previos } = entrada;
  const participaciones = participacionesAGuardar(datos.participaciones);

  // Cada persona tiene que ser del grupo y estar activa (o ya estar en esta juntada).
  const ids = [
    ...new Set([...participaciones, ...datos.acciones].map((f) => f.integranteId)),
  ];
  const encontrados = await tx<{ id: string; activo: boolean }[]>`
    SELECT id, egreso_en IS NULL AS activo
    FROM integrantes WHERE grupo_id = ${grupoId} AND id IN ${tx(ids)}
  `;
  for (const id of ids) {
    const integrante = encontrados.find((e) => e.id === id);
    if (!integrante) {
      throw new ErrorDeDominio("Hay una persona que no es de este grupo");
    }
    if (!integrante.activo && !previos.integrantes.has(id)) {
      throw new ErrorDeDominio("Hay una persona que ya no está en el grupo");
    }
  }

  // Las acciones archivadas solo se mantienen si ya estaban en esta juntada.
  const acciones = await cargarAcciones(tx, grupoId);
  for (const marcada of datos.acciones) {
    const accion = acciones.find((a) => a.id === marcada.accionId);
    if (accion?.archivada && !previos.acciones.has(accion.id)) {
      throw new ErrorDeDominio(`"${accion.nombre}" está archivada y no se puede usar`);
    }
  }

  // El motor de puntos valida repetidos y acciones que no son del grupo.
  // Lo corremos antes de guardar para cortar con un error claro.
  calcularPuntosDeJuntada(
    { fecha: datos.fecha, participaciones, accionesMarcadas: datos.acciones },
    acciones,
  );

  if (participaciones.length > 0) {
    const filas = participaciones.map((p) => ({
      grupo_id: grupoId,
      juntada_id: juntadaId,
      integrante_id: p.integranteId,
      estado: p.estado,
    }));
    await tx`
      INSERT INTO participaciones ${tx(filas, "grupo_id", "juntada_id", "integrante_id", "estado")}
    `;
  }

  if (datos.acciones.length > 0) {
    const filas = datos.acciones.map((a) => ({
      grupo_id: grupoId,
      temporada_id: temporadaId,
      integrante_id: a.integranteId,
      accion_id: a.accionId,
      juntada_id: juntadaId,
      fecha: datos.fecha,
      creado_por: creadoPor,
    }));
    await tx`
      INSERT INTO acciones_registradas ${tx(
        filas,
        "grupo_id",
        "temporada_id",
        "integrante_id",
        "accion_id",
        "juntada_id",
        "fecha",
        "creado_por",
      )}
    `;
  }
}

/**
 * Regenera los puntos de una juntada a partir de lo que tiene guardado.
 * Si está cancelada, queda sin puntos.
 */
export async function recalcularPuntosDeJuntada(
  tx: TransactionSql,
  juntadaId: string,
): Promise<void> {
  await tx`DELETE FROM registros_puntos WHERE juntada_id = ${juntadaId}`;

  const [juntada] = await tx<
    { grupoId: string; temporadaId: string; fecha: string; cancelada: boolean }[]
  >`
    SELECT grupo_id AS "grupoId", temporada_id AS "temporadaId", fecha::text AS fecha,
           cancelada_en IS NOT NULL AS cancelada
    FROM juntadas WHERE id = ${juntadaId}
  `;
  if (juntada.cancelada) return;

  const participaciones = await tx<{ integranteId: string; estado: EstadoDeParticipacion }[]>`
    SELECT integrante_id AS "integranteId", estado FROM participaciones WHERE juntada_id = ${juntadaId}
  `;
  const marcadas = await tx<{ id: string; integranteId: string; accionId: string }[]>`
    SELECT id, integrante_id AS "integranteId", accion_id AS "accionId"
    FROM acciones_registradas WHERE juntada_id = ${juntadaId}
  `;
  const acciones = await cargarAcciones(tx, juntada.grupoId);

  const registros = calcularPuntosDeJuntada(
    { fecha: juntada.fecha, participaciones, accionesMarcadas: marcadas },
    acciones,
  );
  if (registros.length === 0) return;

  const filas = registros.map((registro) => ({
    grupo_id: juntada.grupoId,
    temporada_id: juntada.temporadaId,
    integrante_id: registro.integranteId,
    accion_id: registro.accionId,
    juntada_id: juntadaId,
    // Las acciones marcadas a mano quedan enlazadas a su fila; asistir/faltar no.
    accion_registrada_id:
      marcadas.find(
        (m) => m.integranteId === registro.integranteId && m.accionId === registro.accionId,
      )?.id ?? null,
    fecha: juntada.fecha,
    puntos: registro.puntos,
    motivo: registro.motivo,
  }));
  await tx`
    INSERT INTO registros_puntos ${tx(
      filas,
      "grupo_id",
      "temporada_id",
      "integrante_id",
      "accion_id",
      "juntada_id",
      "accion_registrada_id",
      "fecha",
      "puntos",
      "motivo",
    )}
  `;
}
