/**
 * Acciones puntuables y sus valores.
 *
 * Cada grupo tiene su propia lista de acciones (positivas o negativas).
 * Los puntos de una acción tienen historial: cuando el grupo cambia el valor,
 * se agrega uno nuevo "vigente desde" esa fecha. Así lo que ya pasó conserva
 * el valor que tenía cuando ocurrió, aunque se edite después.
 *
 * Las fechas se manejan como texto "AAAA-MM-DD": se comparan bien como strings
 * y evitan problemas de zona horaria.
 */
import { ErrorDeDominio } from "./errores";

/** Acciones que el sistema aplica solo, según el estado de asistencia. */
export type ClaveSistema = "asistir" | "faltar";

export type ValorDePuntos = {
  puntos: number;
  vigenteDesde: string; // AAAA-MM-DD
};

export type Accion = {
  id: string;
  clave: ClaveSistema | null; // null = acción común, se marca a mano
  nombre: string;
  historialDePuntos: ValorDePuntos[];
};

/** Lista que se copia a cada grupo nuevo. Después el grupo la edita como quiera. */
export const ACCIONES_POR_DEFECTO: {
  clave: ClaveSistema | null;
  nombre: string;
  puntos: number;
}[] = [
  { clave: "asistir", nombre: "Asistir", puntos: 3 },
  { clave: null, nombre: "Poner casa", puntos: 3 },
  { clave: null, nombre: "Cocinar", puntos: 2 },
  { clave: null, nombre: "Organizar", puntos: 2 },
  { clave: null, nombre: "Propuso plan", puntos: 1 },
  { clave: null, nombre: "Poner auto", puntos: 1 },
  { clave: "faltar", nombre: "Faltar", puntos: -1 },
  { clave: null, nombre: "Faltar sin avisar", puntos: -3 },
  { clave: null, nombre: "Faltó por estar con la pareja", puntos: -3 },
  { clave: null, nombre: "Llegar muy tarde", puntos: -2 },
];

/**
 * Puntos que valía una acción en una fecha dada.
 *
 * Se usa el último valor vigente a esa fecha. Si el evento es anterior al
 * primer valor (por ejemplo, una juntada vieja cargada tarde), se usa el
 * primer valor que tuvo la acción.
 */
export function puntosVigentes(historial: ValorDePuntos[], fecha: string): number {
  if (historial.length === 0) {
    throw new ErrorDeDominio("La acción no tiene puntos definidos");
  }

  const ordenado = [...historial].sort((a, b) =>
    a.vigenteDesde.localeCompare(b.vigenteDesde),
  );

  let elegido = ordenado[0];
  for (const valor of ordenado) {
    if (valor.vigenteDesde <= fecha) {
      elegido = valor;
    }
  }
  return elegido.puntos;
}
