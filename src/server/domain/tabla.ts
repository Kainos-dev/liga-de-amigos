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
  /** Puntos sumados por cada acción: { [accionId]: puntos } */
  desglose: Record<string, number>;
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
    fila.desglose[registro.accionId] =
      (fila.desglose[registro.accionId] ?? 0) + registro.puntos;

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
