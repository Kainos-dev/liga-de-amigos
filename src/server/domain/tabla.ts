/**
 * Tabla de posiciones de una temporada, armada a partir de los registros
 * de puntos. Nunca se guarda un total: se recalcula cada vez.
 *
 * Orden y desempate:
 *   1. Más puntos.
 *   2. Más asistencias.
 *   3. Más contribuciones (acciones con puntos positivos que no sean asistir).
 *   4. Si sigue igual, comparten la posición (1, 1, 3...).
 */
import type { ClaveSistema } from "./acciones";

export type RegistroParaTabla = {
  integranteId: string;
  accionId: string;
  clave: ClaveSistema | null; // clave de la acción del registro
  puntos: number;
};

export type FilaDeTabla = {
  integranteId: string;
  nombre: string;
  posicion: number;
  empatado: boolean;
  puntos: number;
  asistencias: number;
  contribuciones: number;
  /** Por cada acción: cuántas veces y cuántos puntos sumó. { [accionId]: {...} } */
  desglose: Record<string, { veces: number; puntos: number }>;
};

export function armarTabla(
  integrantes: { id: string; nombre: string }[],
  registros: RegistroParaTabla[],
): FilaDeTabla[] {
  // Arrancamos a todos en cero: quien todavía no sumó nada también aparece.
  const filas = new Map<string, FilaDeTabla>();
  for (const integrante of integrantes) {
    filas.set(integrante.id, {
      integranteId: integrante.id,
      nombre: integrante.nombre,
      posicion: 0,
      empatado: false,
      puntos: 0,
      asistencias: 0,
      contribuciones: 0,
      desglose: {},
    });
  }

  for (const registro of registros) {
    const fila = filas.get(registro.integranteId);
    if (!fila) continue; // registro de alguien que no está en la lista pedida

    fila.puntos += registro.puntos;
    const desglose = (fila.desglose[registro.accionId] ??= { veces: 0, puntos: 0 });
    desglose.veces += 1;
    desglose.puntos += registro.puntos;

    if (registro.clave === "asistir") {
      fila.asistencias += 1;
    } else if (registro.puntos > 0) {
      fila.contribuciones += 1;
    }
  }

  const ordenadas = [...filas.values()].sort(
    (a, b) =>
      b.puntos - a.puntos ||
      b.asistencias - a.asistencias ||
      b.contribuciones - a.contribuciones ||
      a.nombre.localeCompare(b.nombre, "es"), // solo para mostrar en orden estable
  );

  // Posiciones compartidas: si empatan en todo, misma posición.
  ordenadas.forEach((fila, indice) => {
    const anterior = ordenadas[indice - 1];
    if (anterior && empatan(anterior, fila)) {
      fila.posicion = anterior.posicion;
      fila.empatado = true;
      anterior.empatado = true;
    } else {
      fila.posicion = indice + 1;
    }
  });

  return ordenadas;
}

function empatan(a: FilaDeTabla, b: FilaDeTabla): boolean {
  return (
    a.puntos === b.puntos &&
    a.asistencias === b.asistencias &&
    a.contribuciones === b.contribuciones
  );
}

/**
 * Cuántos puestos subió (positivo) o bajó (negativo) cada integrante respecto
 * de una tabla anterior. Si en la tabla anterior todavía no había puntos
 * cargados, no hay con qué comparar y devuelve null.
 */
export function cambiosDePosicion(
  actual: FilaDeTabla[],
  anterior: FilaDeTabla[],
  habiaPuntosAntes: boolean,
): Record<string, number> | null {
  if (!habiaPuntosAntes) return null;

  const posicionAnterior = new Map(anterior.map((f) => [f.integranteId, f.posicion]));
  const cambios: Record<string, number> = {};
  for (const fila of actual) {
    const antes = posicionAnterior.get(fila.integranteId);
    if (antes !== undefined) cambios[fila.integranteId] = antes - fila.posicion;
  }
  return cambios;
}

/**
 * Porcentaje de asistencia: veces que fue sobre veces que fue o faltó.
 * "No invitado" y "sin dato" no cuentan. Sin datos, devuelve null (no 0%).
 */
export function porcentajeDeAsistencia(fue: number, falto: number): number | null {
  const total = fue + falto;
  if (total === 0) return null;
  return Math.round((fue / total) * 100);
}

/**
 * Hasta qué fecha (sin incluirla) se arma la tabla "anterior" para comparar:
 * el primer día del mes actual. Para una temporada ya pasada, el 1 de diciembre.
 * Si ese corte cae en el inicio de la temporada, no hay comparación (null).
 */
export function fechaDeCorteParaComparar(anioTemporada: number, hoy: string): string | null {
  const anioHoy = Number(hoy.slice(0, 4));
  const corte =
    anioTemporada < anioHoy ? `${anioTemporada}-12-01` : `${hoy.slice(0, 7)}-01`;
  return corte <= `${anioTemporada}-01-01` ? null : corte;
}
