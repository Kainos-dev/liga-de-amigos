import { describe, expect, it } from "vitest";
import { ErrorDeDominio } from "./errores";
import {
  esquemaJuntada,
  participacionesAGuardar,
  puedeEditar,
  validarFechaDeCarga,
} from "./juntadas";

const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";

const juntadaValida = {
  fecha: "2026-03-14",
  participaciones: [{ integranteId: ID_A, estado: "asistio" }],
  acciones: [],
};

describe("esquemaJuntada", () => {
  it("acepta una juntada mínima y deja los textos vacíos en null", () => {
    const datos = esquemaJuntada.parse({ ...juntadaValida, titulo: "   ", notas: "" });
    expect(datos.titulo).toBeNull();
    expect(datos.notas).toBeNull();
    expect(datos.invitadosExternos).toBeNull();
  });

  it("pide al menos una persona que haya ido", () => {
    const resultado = esquemaJuntada.safeParse({
      ...juntadaValida,
      participaciones: [{ integranteId: ID_A, estado: "ausente_confirmado" }],
    });
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0].message).toMatch(/al menos a una persona/);
  });

  it("rechaza fechas imposibles o mal escritas", () => {
    expect(esquemaJuntada.safeParse({ ...juntadaValida, fecha: "2026-02-31" }).success).toBe(false);
    expect(esquemaJuntada.safeParse({ ...juntadaValida, fecha: "14/03/2026" }).success).toBe(false);
  });

  it("rechaza estados desconocidos", () => {
    const resultado = esquemaJuntada.safeParse({
      ...juntadaValida,
      participaciones: [
        { integranteId: ID_A, estado: "asistio" },
        { integranteId: ID_B, estado: "durmiendo" },
      ],
    });
    expect(resultado.success).toBe(false);
  });
});

describe("puedeEditar", () => {
  const cargada = new Date("2026-03-14T20:00:00Z");
  const horasDespues = (horas: number) => new Date(cargada.getTime() + horas * 3_600_000);

  it("cualquier integrante edita dentro de las 48 h", () => {
    expect(puedeEditar("miembro", cargada, horasDespues(47))).toBe(true);
    expect(puedeEditar("miembro", cargada, horasDespues(48))).toBe(true);
  });

  it("pasadas las 48 h solo un administrador", () => {
    expect(puedeEditar("miembro", cargada, horasDespues(49))).toBe(false);
    expect(puedeEditar("admin", cargada, horasDespues(24 * 300))).toBe(true);
  });
});

describe("validarFechaDeCarga", () => {
  it("acepta fechas de la temporada abierta", () => {
    expect(() => validarFechaDeCarga("2026-03-14", "2026-11-20", false)).not.toThrow();
  });

  it("no acepta fechas futuras", () => {
    expect(() => validarFechaDeCarga("2026-11-21", "2026-11-20", false)).toThrow(/futura/);
  });

  it("acepta cosas del año anterior durante el período de gracia", () => {
    expect(() => validarFechaDeCarga("2026-12-30", "2027-01-10", false)).not.toThrow();
    expect(() => validarFechaDeCarga("2026-12-30", "2027-01-20", false)).toThrow(ErrorDeDominio);
  });

  it("no acepta cargas en una temporada cerrada", () => {
    expect(() => validarFechaDeCarga("2026-03-14", "2026-11-20", true)).toThrow(/cerrada/);
  });
});

describe("participacionesAGuardar", () => {
  it("descarta las filas sin dato", () => {
    expect(
      participacionesAGuardar([
        { integranteId: ID_A, estado: "asistio" },
        { integranteId: ID_B, estado: "sin_dato" },
      ]),
    ).toEqual([{ integranteId: ID_A, estado: "asistio" }]);
  });
});
