/**
 * Motor de puntos: a partir de lo que pasó (asistencias y acciones marcadas)
 * calcula los registros de puntos que le corresponden a cada integrante.
 *
 * Es una función pura: no toca la base. El service guarda el resultado en
 * `registros_puntos`. Cuando se edita una juntada, se borran sus registros y
 * se vuelve a llamar a esta función, así nunca quedan puntos duplicados.
 */
import { type Accion, ErrorDeDominio, puntosVigentes } from "./acciones";

export type EstadoDeParticipacion =
  | "asistio"
  | "ausente_confirmado"
  | "no_invitado"
  | "sin_dato";

export type Participacion = {
  integranteId: string;
  estado: EstadoDeParticipacion;
};

/** Una acción común marcada a un integrante ("Juli cocinó"). */
export type AccionMarcada = {
  integranteId: string;
  accionId: string;
};

export type DatosDeJuntada = {
  fecha: string; // AAAA-MM-DD
  participaciones: Participacion[];
  accionesMarcadas: AccionMarcada[];
};

export type RegistroCalculado = {
  integranteId: string;
  accionId: string;
  puntos: number;
  motivo: string;
};

/** Qué acción del sistema se aplica sola según el estado de asistencia. */
const ACCION_AUTOMATICA: Record<EstadoDeParticipacion, "asistir" | "faltar" | null> = {
  asistio: "asistir",
  ausente_confirmado: "faltar",
  no_invitado: null, // no estar invitado no es faltar
  sin_dato: null,
};

export function calcularPuntosDeJuntada(
  juntada: DatosDeJuntada,
  acciones: Accion[],
): RegistroCalculado[] {
  const accionesPorId = new Map(acciones.map((a) => [a.id, a]));
  const registros: RegistroCalculado[] = [];

  // 1. Puntos automáticos por asistencia o falta.
  const yaTieneEstado = new Set<string>();
  for (const participacion of juntada.participaciones) {
    if (yaTieneEstado.has(participacion.integranteId)) {
      throw new ErrorDeDominio("Un integrante aparece dos veces en la asistencia");
    }
    yaTieneEstado.add(participacion.integranteId);

    const clave = ACCION_AUTOMATICA[participacion.estado];
    if (!clave) continue;

    // Si el grupo no tiene la acción de sistema, no se suma nada.
    const accion = acciones.find((a) => a.clave === clave);
    if (!accion) continue;

    registros.push({
      integranteId: participacion.integranteId,
      accionId: accion.id,
      puntos: puntosVigentes(accion.historialDePuntos, juntada.fecha),
      motivo: accion.nombre,
    });
  }

  // 2. Acciones marcadas a mano. Cada persona suma sus puntos por separado
  //    (si cocinan dos, cada uno recibe los puntos completos).
  const yaMarcada = new Set<string>();
  for (const marcada of juntada.accionesMarcadas) {
    const accion = accionesPorId.get(marcada.accionId);
    if (!accion) {
      throw new ErrorDeDominio("La acción no existe en este grupo");
    }
    if (accion.clave) {
      throw new ErrorDeDominio(
        `"${accion.nombre}" se aplica sola según la asistencia, no se marca a mano`,
      );
    }

    const llave = `${marcada.integranteId}|${marcada.accionId}`;
    if (yaMarcada.has(llave)) {
      throw new ErrorDeDominio(
        `"${accion.nombre}" está marcada dos veces para el mismo integrante`,
      );
    }
    yaMarcada.add(llave);

    registros.push({
      integranteId: marcada.integranteId,
      accionId: accion.id,
      puntos: puntosVigentes(accion.historialDePuntos, juntada.fecha),
      motivo: accion.nombre,
    });
  }

  return registros;
}

/**
 * Puntos de una acción suelta, fuera de una juntada
 * ("se acordó del cumpleaños de Juli").
 */
export function calcularPuntosDeAccionSuelta(
  suelta: { fecha: string; integranteId: string; accionId: string },
  acciones: Accion[],
): RegistroCalculado {
  const accion = acciones.find((a) => a.id === suelta.accionId);
  if (!accion) {
    throw new ErrorDeDominio("La acción no existe en este grupo");
  }
  if (accion.clave) {
    throw new ErrorDeDominio(`"${accion.nombre}" solo se usa dentro de una juntada`);
  }

  return {
    integranteId: suelta.integranteId,
    accionId: accion.id,
    puntos: puntosVigentes(accion.historialDePuntos, suelta.fecha),
    motivo: accion.nombre,
  };
}
