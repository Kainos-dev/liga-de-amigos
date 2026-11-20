import "server-only";
import { sql } from "@/server/db";
import { ErrorDeDominio } from "@/server/domain/errores";
import { hoy } from "@/server/domain/fechas";
import type { EstadoDeParticipacion } from "@/server/domain/puntos";
import {
  type DatosDeTemporada,
  type ResumenAnual,
  type ResumenMensual,
  resumenAnual,
  resumenMensual,
} from "@/server/domain/resumenes";
import type { RegistroParaTabla } from "@/server/domain/tabla";
import { anioDeTemporada, validarCierre } from "@/server/domain/temporadas";
import { registrarAuditoria } from "@/server/services/auditoria";
import { exigirAdmin, exigirIntegrante } from "@/server/services/permisos";
import { calcularTabla, integrantesDeLaTemporada, type TablaCalculada } from "@/server/services/tabla";
import { elegirTemporada } from "@/server/services/temporadas";

/** Cómo mostrar a cada persona que aparece en un resumen. */
export type Personas = Record<
  string,
  { nombre: string; avatarEmoji: string | null; avatarColor: string | null }
>;

/** Carga todo lo de una temporada que necesitan los resúmenes. */
async function cargarDatos(
  grupoId: string,
  temporadaId: string,
): Promise<{ datos: DatosDeTemporada; personas: Personas }> {
  const [integrantes, juntadas, participaciones, registros, acciones] = await Promise.all([
    integrantesDeLaTemporada(grupoId, temporadaId),
    sql<DatosDeTemporada["juntadas"]>`
      SELECT id, fecha::text AS fecha, titulo FROM juntadas
      WHERE temporada_id = ${temporadaId} AND cancelada_en IS NULL
    `,
    sql<{ juntadaId: string; integranteId: string; estado: EstadoDeParticipacion }[]>`
      SELECT p.juntada_id AS "juntadaId", p.integrante_id AS "integranteId", p.estado
      FROM participaciones p JOIN juntadas j ON j.id = p.juntada_id
      WHERE j.temporada_id = ${temporadaId} AND j.cancelada_en IS NULL
    `,
    sql<(RegistroParaTabla & { fecha: string })[]>`
      SELECT r.integrante_id AS "integranteId", r.accion_id AS "accionId", a.clave,
             r.puntos, r.fecha::text AS fecha
      FROM registros_puntos r JOIN acciones a ON a.id = r.accion_id
      WHERE r.temporada_id = ${temporadaId}
    `,
    sql<DatosDeTemporada["acciones"]>`
      SELECT id, nombre, clave FROM acciones WHERE grupo_id = ${grupoId} ORDER BY creado_en
    `,
  ]);

  return {
    datos: {
      integrantes: integrantes.map((i) => ({ id: i.id, nombre: i.nombre })),
      juntadas,
      participaciones,
      registros,
      acciones,
    },
    personas: Object.fromEntries(
      integrantes.map((i) => [
        i.id,
        { nombre: i.nombre, avatarEmoji: i.avatarEmoji, avatarColor: i.avatarColor },
      ]),
    ),
  };
}

// ─── Mensual ────────────────────────────────────────────────────────────────

export type VistaMensual = {
  resumen: ResumenMensual;
  personas: Personas;
  anterior: string | null; // mes anterior navegable (AAAA-MM), dentro de la temporada
  siguiente: string | null;
};

/** Resumen de un mes ("AAAA-MM"); por defecto, el mes actual. */
export async function obtenerResumenMensual(
  usuarioId: string,
  grupoId: string,
  mesPedido?: string,
): Promise<VistaMensual> {
  await exigirIntegrante(usuarioId, grupoId);
  const mesActual = hoy().slice(0, 7);
  const mes = mesPedido ?? mesActual;
  if (mes > mesActual) {
    throw new ErrorDeDominio("Ese mes todavía no llegó");
  }

  const { temporada } = await elegirTemporada(grupoId, anioDeTemporada(`${mes}-01`));
  const { datos, personas } = await cargarDatos(grupoId, temporada.id);

  // Navegación: de enero hasta el mes actual (o diciembre si la temporada ya pasó).
  const numero = Number(mes.slice(5, 7));
  const anio = mes.slice(0, 4);
  const anterior = numero > 1 ? `${anio}-${String(numero - 1).padStart(2, "0")}` : null;
  const posible = numero < 12 ? `${anio}-${String(numero + 1).padStart(2, "0")}` : null;

  return {
    resumen: resumenMensual(datos, mes),
    personas,
    anterior,
    siguiente: posible && posible <= mesActual ? posible : null,
  };
}

// ─── Anual y cierre ─────────────────────────────────────────────────────────

export type VistaAnual = {
  resumen: ResumenAnual;
  personas: Personas;
  cerrada: boolean;
  temporadas: number[];
  /** El usuario es admin y la temporada ya terminó pero sigue abierta. */
  puedeCerrar: boolean;
};

type Congelado = { tabla: TablaCalculada; resumen: ResumenAnual; personas: Personas };

export async function obtenerResumenAnual(
  usuarioId: string,
  grupoId: string,
  anioPedido?: number,
): Promise<VistaAnual> {
  const membresia = await exigirIntegrante(usuarioId, grupoId);
  const { temporada, anios } = await elegirTemporada(grupoId, anioPedido);

  let resumen: ResumenAnual;
  let personas: Personas;
  const [cierre] = temporada.cerrada
    ? await sql<{ resumen: Congelado["resumen"]; tabla: Congelado["tabla"] }[]>`
        SELECT resumen, tabla FROM cierres_temporada WHERE temporada_id = ${temporada.id}
      `
    : [];

  if (cierre) {
    resumen = cierre.resumen;
    personas = personasDeLaTabla(cierre.tabla);
  } else {
    const cargado = await cargarDatos(grupoId, temporada.id);
    resumen = resumenAnual(cargado.datos, temporada.anio, hoy());
    personas = cargado.personas;
  }

  let puedeCerrar = false;
  if (membresia.rol === "admin") {
    try {
      validarCierre(temporada.anio, hoy(), temporada.cerrada);
      puedeCerrar = true;
    } catch {
      puedeCerrar = false;
    }
  }

  return { resumen, personas, cerrada: temporada.cerrada, temporadas: anios, puedeCerrar };
}

/**
 * Cierra una temporada (solo administradores, desde el 1 de enero): guarda la
 * foto de la tabla final y del resumen anual y deja de admitir cargas.
 */
export async function cerrarTemporada(usuarioId: string, grupoId: string, anio: number): Promise<void> {
  await exigirAdmin(usuarioId, grupoId);
  const { temporada } = await elegirTemporada(grupoId, anio);
  validarCierre(temporada.anio, hoy(), temporada.cerrada);

  // Se calcula antes de la transacción con los datos actuales; después del
  // cierre ya no se puede cargar ni editar nada en esta temporada.
  const tabla = await calcularTabla(grupoId, temporada);
  const { datos } = await cargarDatos(grupoId, temporada.id);
  const resumen = resumenAnual(datos, temporada.anio, hoy());

  await sql.begin(async (tx) => {
    // FOR UPDATE: si dos administradores cierran a la vez, el segundo espera y falla.
    const [actual] = await tx<{ cerrada: boolean }[]>`
      SELECT cerrada_en IS NOT NULL AS cerrada FROM temporadas WHERE id = ${temporada.id} FOR UPDATE
    `;
    validarCierre(temporada.anio, hoy(), actual.cerrada);

    await tx`
      INSERT INTO cierres_temporada (temporada_id, grupo_id, tabla, resumen, cerrada_por)
      VALUES (${temporada.id}, ${grupoId}, ${tx.json({ ...tabla, cerrada: true })},
              ${tx.json(resumen)}, ${usuarioId})
    `;
    await tx`UPDATE temporadas SET cerrada_en = now() WHERE id = ${temporada.id}`;
    await registrarAuditoria(tx, {
      grupoId,
      usuarioId,
      accion: "temporada.cerrar",
      entidad: "temporada",
      entidadId: temporada.id,
      datos: { anio: temporada.anio },
    });
  });
}

function personasDeLaTabla(tabla: TablaCalculada): Personas {
  return Object.fromEntries(
    tabla.filas.map((f) => [
      f.integranteId,
      { nombre: f.nombre, avatarEmoji: f.avatarEmoji, avatarColor: f.avatarColor },
    ]),
  );
}
