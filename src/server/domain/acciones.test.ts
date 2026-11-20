import { describe, expect, it } from "vitest";
import { ACCIONES_POR_DEFECTO, ErrorDeDominio, puntosVigentes } from "./acciones";

describe("puntosVigentes", () => {
  const historial = [
    { puntos: 3, vigenteDesde: "2026-01-01" },
    { puntos: 7, vigenteDesde: "2026-06-01" },
  ];

  it("usa el valor vigente a la fecha del evento", () => {
    expect(puntosVigentes(historial, "2026-03-10")).toBe(3);
    expect(puntosVigentes(historial, "2026-08-10")).toBe(7);
  });

  it("el cambio rige desde el mismo día", () => {
    expect(puntosVigentes(historial, "2026-06-01")).toBe(7);
    expect(puntosVigentes(historial, "2026-05-31")).toBe(3);
  });

  it("no depende del orden en que vienen los valores", () => {
    expect(puntosVigentes([...historial].reverse(), "2026-08-10")).toBe(7);
  });

  it("un evento anterior al primer valor usa el primer valor", () => {
    expect(puntosVigentes(historial, "2025-12-01")).toBe(3);
  });

  it("acepta puntos negativos", () => {
    expect(puntosVigentes([{ puntos: -3, vigenteDesde: "2026-01-01" }], "2026-02-01")).toBe(-3);
  });

  it("falla si la acción no tiene valores", () => {
    expect(() => puntosVigentes([], "2026-01-01")).toThrow(ErrorDeDominio);
  });
});

describe("ACCIONES_POR_DEFECTO", () => {
  it("incluye exactamente una acción de sistema para asistir y otra para faltar", () => {
    const claves = ACCIONES_POR_DEFECTO.map((a) => a.clave).filter(Boolean);
    expect(claves.sort()).toEqual(["asistir", "faltar"]);
  });

  it("no repite nombres", () => {
    const nombres = ACCIONES_POR_DEFECTO.map((a) => a.nombre.toLowerCase());
    expect(new Set(nombres).size).toBe(nombres.length);
  });
});
