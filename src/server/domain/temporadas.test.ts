import { describe, expect, it } from "vitest";
import {
  admiteCargas,
  anioDeTemporada,
  finDelPeriodoDeGracia,
  inicioYFin,
  validarCierre,
} from "./temporadas";

describe("temporadas", () => {
  it("la temporada es el año de la fecha", () => {
    expect(anioDeTemporada("2026-12-31")).toBe(2026);
    expect(anioDeTemporada("2027-01-01")).toBe(2027);
  });

  it("va del 1 de enero al 31 de diciembre", () => {
    expect(inicioYFin(2026)).toEqual({ inicio: "2026-01-01", fin: "2026-12-31" });
  });

  it("el período de gracia termina el 15 de enero del año siguiente", () => {
    expect(finDelPeriodoDeGracia(2026)).toBe("2027-01-15");
    expect(finDelPeriodoDeGracia(2026, 40)).toBe("2027-02-09");
  });

  it("admite cargas hasta el último día de gracia inclusive", () => {
    expect(admiteCargas(2026, "2026-07-01", false)).toBe(true);
    expect(admiteCargas(2026, "2027-01-15", false)).toBe(true);
    expect(admiteCargas(2026, "2027-01-16", false)).toBe(false);
  });

  it("una temporada cerrada no admite cargas", () => {
    expect(admiteCargas(2026, "2026-07-01", true)).toBe(false);
  });
});

describe("validarCierre", () => {
  it("no se cierra antes de que termine el año", () => {
    expect(() => validarCierre(2026, "2026-12-31", false)).toThrow(/1 de enero/);
  });

  it("se puede cerrar desde el 1 de enero", () => {
    expect(() => validarCierre(2026, "2027-01-01", false)).not.toThrow();
    expect(() => validarCierre(2026, "2027-06-01", false)).not.toThrow();
  });

  it("no se cierra dos veces", () => {
    expect(() => validarCierre(2026, "2027-01-05", true)).toThrow(/ya está cerrada/);
  });
});
