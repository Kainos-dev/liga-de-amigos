import { describe, expect, it } from "vitest";
import {
  armarTabla,
  cambiosDePosicion,
  fechaDeCorteParaComparar,
  porcentajeDeAsistencia,
  type RegistroParaTabla,
} from "./tabla";

const asistir = (integranteId: string): RegistroParaTabla => ({
  integranteId,
  accionId: "asistir",
  clave: "asistir",
  puntos: 3,
});
const accion = (integranteId: string, accionId: string, puntos: number): RegistroParaTabla => ({
  integranteId,
  accionId,
  clave: null,
  puntos,
});

const integrantes = [
  { id: "juli", nombre: "Juli" },
  { id: "tomi", nombre: "Tomi" },
  { id: "caro", nombre: "Caro" },
];

/** [nombre, posicion] de cada fila, en orden. */
const resumen = (tabla: ReturnType<typeof armarTabla>) =>
  tabla.map((f) => [f.nombre, f.posicion]);

describe("armarTabla", () => {
  it("ordena por puntos y muestra también a quien no sumó nada", () => {
    const tabla = armarTabla(integrantes, [
      asistir("juli"),
      accion("juli", "casa", 3),
      asistir("tomi"),
    ]);
    expect(resumen(tabla)).toEqual([
      ["Juli", 1],
      ["Tomi", 2],
      ["Caro", 3],
    ]);
    expect(tabla[2].puntos).toBe(0);
  });

  it("permite totales negativos", () => {
    const tabla = armarTabla(integrantes, [
      accion("tomi", "faltar", -1),
      accion("tomi", "pareja", -3),
    ]);
    const tomi = tabla.find((f) => f.integranteId === "tomi");
    expect(tomi?.puntos).toBe(-4);
    expect(tabla.at(-1)?.integranteId).toBe("tomi");
  });

  it("desempata por más asistencias", () => {
    // Juli: 2 asistencias = 6. Tomi: 1 asistencia + casa = 6.
    const tabla = armarTabla(integrantes, [
      asistir("juli"),
      asistir("juli"),
      asistir("tomi"),
      accion("tomi", "casa", 3),
    ]);
    expect(resumen(tabla).slice(0, 2)).toEqual([
      ["Juli", 1],
      ["Tomi", 2],
    ]);
  });

  it("después desempata por más contribuciones", () => {
    // Mismos puntos y asistencias; Tomi tiene dos contribuciones contra una.
    const tabla = armarTabla(integrantes, [
      asistir("juli"),
      accion("juli", "casa", 3),
      asistir("tomi"),
      accion("tomi", "cocinar", 2),
      accion("tomi", "auto", 1),
    ]);
    expect(resumen(tabla).slice(0, 2)).toEqual([
      ["Tomi", 1],
      ["Juli", 2],
    ]);
  });

  it("las acciones negativas no cuentan como contribución", () => {
    const tabla = armarTabla(integrantes, [accion("tomi", "tarde", -2)]);
    expect(tabla.find((f) => f.integranteId === "tomi")?.contribuciones).toBe(0);
  });

  it("si empatan en todo comparten la posición y el siguiente salta", () => {
    const tabla = armarTabla(integrantes, [asistir("juli"), asistir("tomi")]);
    expect(resumen(tabla)).toEqual([
      ["Juli", 1],
      ["Tomi", 1],
      ["Caro", 3],
    ]);
    expect(tabla[0].empatado).toBe(true);
    expect(tabla[1].empatado).toBe(true);
    expect(tabla[2].empatado).toBe(false);
  });

  it("arma el desglose de puntos por acción", () => {
    const tabla = armarTabla(integrantes, [
      asistir("juli"),
      asistir("juli"),
      accion("juli", "casa", 3),
    ]);
    expect(tabla[0].desglose).toEqual({
      asistir: { veces: 2, puntos: 6 },
      casa: { veces: 1, puntos: 3 },
    });
  });

  it("ignora registros de quien no está en la lista", () => {
    const tabla = armarTabla(integrantes, [asistir("otro")]);
    expect(tabla.every((f) => f.puntos === 0)).toBe(true);
  });
});

describe("cambiosDePosicion", () => {
  it("positivo si subió, negativo si bajó, cero si quedó igual", () => {
    const antes = armarTabla(integrantes, [asistir("juli"), asistir("juli"), asistir("tomi")]);
    // Después Caro se mandó con todo y pasó al frente.
    const ahora = armarTabla(integrantes, [
      asistir("juli"),
      asistir("juli"),
      asistir("tomi"),
      accion("caro", "casa", 10),
    ]);
    expect(cambiosDePosicion(ahora, antes, true)).toEqual({ caro: 2, juli: -1, tomi: -1 });
  });

  it("sin puntos en la tabla anterior no hay comparación", () => {
    const tabla = armarTabla(integrantes, [asistir("juli")]);
    expect(cambiosDePosicion(tabla, armarTabla(integrantes, []), false)).toBeNull();
  });
});

describe("porcentajeDeAsistencia", () => {
  it("fue sobre fue + faltó, redondeado", () => {
    expect(porcentajeDeAsistencia(2, 1)).toBe(67);
    expect(porcentajeDeAsistencia(4, 0)).toBe(100);
  });

  it("sin datos devuelve null, no 0%", () => {
    expect(porcentajeDeAsistencia(0, 0)).toBeNull();
  });
});

describe("fechaDeCorteParaComparar", () => {
  it("en la temporada actual compara con el cierre del mes anterior", () => {
    expect(fechaDeCorteParaComparar(2026, "2026-11-20")).toBe("2026-11-01");
  });

  it("en enero de la temporada actual todavía no hay con qué comparar", () => {
    expect(fechaDeCorteParaComparar(2026, "2026-01-15")).toBeNull();
  });

  it("en una temporada pasada compara con el 1 de diciembre", () => {
    expect(fechaDeCorteParaComparar(2026, "2027-03-10")).toBe("2026-12-01");
  });
});
