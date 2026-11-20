import { describe, expect, it } from "vitest";
import type { Accion } from "./acciones";
import { ErrorDeDominio } from "./errores";
import {
  calcularPuntosDeAccionSuelta,
  calcularPuntosDeJuntada,
  type DatosDeJuntada,
} from "./puntos";

const desde2026 = (puntos: number) => [{ puntos, vigenteDesde: "2026-01-01" }];

const acciones: Accion[] = [
  { id: "asistir", clave: "asistir", nombre: "Asistir", historialDePuntos: desde2026(3) },
  { id: "faltar", clave: "faltar", nombre: "Faltar", historialDePuntos: desde2026(-1) },
  { id: "casa", clave: null, nombre: "Poner casa", historialDePuntos: desde2026(3) },
  { id: "cocinar", clave: null, nombre: "Cocinar", historialDePuntos: desde2026(2) },
  { id: "pareja", clave: null, nombre: "Faltó por estar con la pareja", historialDePuntos: desde2026(-3) },
];

function juntada(parcial: Partial<DatosDeJuntada>): DatosDeJuntada {
  return { fecha: "2026-03-14", participaciones: [], accionesMarcadas: [], ...parcial };
}

/** Total por integrante, para que los tests se lean fácil. */
function totales(registros: { integranteId: string; puntos: number }[]) {
  const resultado: Record<string, number> = {};
  for (const r of registros) {
    resultado[r.integranteId] = (resultado[r.integranteId] ?? 0) + r.puntos;
  }
  return resultado;
}

describe("calcularPuntosDeJuntada", () => {
  it("asistir y faltar se aplican solos según el estado", () => {
    const registros = calcularPuntosDeJuntada(
      juntada({
        participaciones: [
          { integranteId: "juli", estado: "asistio" },
          { integranteId: "tomi", estado: "ausente_confirmado" },
        ],
      }),
      acciones,
    );
    expect(totales(registros)).toEqual({ juli: 3, tomi: -1 });
    expect(registros.map((r) => r.motivo)).toEqual(["Asistir", "Faltar"]);
  });

  it("no invitado y sin dato no suman ni restan", () => {
    const registros = calcularPuntosDeJuntada(
      juntada({
        participaciones: [
          { integranteId: "caro", estado: "no_invitado" },
          { integranteId: "nico", estado: "sin_dato" },
        ],
      }),
      acciones,
    );
    expect(registros).toEqual([]);
  });

  it("si cocinan dos, cada uno recibe los puntos completos", () => {
    const registros = calcularPuntosDeJuntada(
      juntada({
        participaciones: [
          { integranteId: "juli", estado: "asistio" },
          { integranteId: "tomi", estado: "asistio" },
        ],
        accionesMarcadas: [
          { integranteId: "juli", accionId: "cocinar" },
          { integranteId: "tomi", accionId: "cocinar" },
        ],
      }),
      acciones,
    );
    expect(totales(registros)).toEqual({ juli: 5, tomi: 5 });
  });

  it("se puede sumar por poner casa sin haber asistido", () => {
    const registros = calcularPuntosDeJuntada(
      juntada({
        participaciones: [{ integranteId: "caro", estado: "ausente_confirmado" }],
        accionesMarcadas: [{ integranteId: "caro", accionId: "casa" }],
      }),
      acciones,
    );
    expect(totales(registros)).toEqual({ caro: 2 }); // -1 + 3
  });

  it("las acciones negativas se suman a la falta", () => {
    const registros = calcularPuntosDeJuntada(
      juntada({
        participaciones: [{ integranteId: "tomi", estado: "ausente_confirmado" }],
        accionesMarcadas: [{ integranteId: "tomi", accionId: "pareja" }],
      }),
      acciones,
    );
    expect(totales(registros)).toEqual({ tomi: -4 });
  });

  it("usa el valor de la acción vigente a la fecha de la juntada", () => {
    const conCambio: Accion[] = [
      {
        id: "casa",
        clave: null,
        nombre: "Poner casa",
        historialDePuntos: [
          { puntos: 3, vigenteDesde: "2026-01-01" },
          { puntos: 7, vigenteDesde: "2026-06-01" },
        ],
      },
    ];
    const marcada = [{ integranteId: "juli", accionId: "casa" }];

    const antes = calcularPuntosDeJuntada(
      juntada({ fecha: "2026-05-20", accionesMarcadas: marcada }),
      conCambio,
    );
    const despues = calcularPuntosDeJuntada(
      juntada({ fecha: "2026-06-20", accionesMarcadas: marcada }),
      conCambio,
    );
    expect(antes[0].puntos).toBe(3);
    expect(despues[0].puntos).toBe(7);
  });

  it("si el grupo no tiene la acción de sistema, asistir no suma", () => {
    const sinAsistir = acciones.filter((a) => a.clave !== "asistir");
    const registros = calcularPuntosDeJuntada(
      juntada({ participaciones: [{ integranteId: "juli", estado: "asistio" }] }),
      sinAsistir,
    );
    expect(registros).toEqual([]);
  });

  it("rechaza la misma acción dos veces para el mismo integrante", () => {
    expect(() =>
      calcularPuntosDeJuntada(
        juntada({
          accionesMarcadas: [
            { integranteId: "juli", accionId: "cocinar" },
            { integranteId: "juli", accionId: "cocinar" },
          ],
        }),
        acciones,
      ),
    ).toThrow(ErrorDeDominio);
  });

  it("rechaza un integrante repetido en la asistencia", () => {
    expect(() =>
      calcularPuntosDeJuntada(
        juntada({
          participaciones: [
            { integranteId: "juli", estado: "asistio" },
            { integranteId: "juli", estado: "ausente_confirmado" },
          ],
        }),
        acciones,
      ),
    ).toThrow(ErrorDeDominio);
  });

  it("rechaza marcar a mano asistir o faltar", () => {
    expect(() =>
      calcularPuntosDeJuntada(
        juntada({ accionesMarcadas: [{ integranteId: "juli", accionId: "asistir" }] }),
        acciones,
      ),
    ).toThrow(/se aplica sola/);
  });

  it("rechaza acciones que no son del grupo", () => {
    expect(() =>
      calcularPuntosDeJuntada(
        juntada({ accionesMarcadas: [{ integranteId: "juli", accionId: "otra" }] }),
        acciones,
      ),
    ).toThrow(ErrorDeDominio);
  });

  it("calcular dos veces la misma juntada da exactamente lo mismo", () => {
    const datos = juntada({
      participaciones: [{ integranteId: "juli", estado: "asistio" }],
      accionesMarcadas: [{ integranteId: "juli", accionId: "casa" }],
    });
    expect(calcularPuntosDeJuntada(datos, acciones)).toEqual(
      calcularPuntosDeJuntada(datos, acciones),
    );
  });
});

describe("calcularPuntosDeAccionSuelta", () => {
  it("calcula los puntos de una acción fuera de una juntada", () => {
    const registro = calcularPuntosDeAccionSuelta(
      { fecha: "2026-04-02", integranteId: "tomi", accionId: "casa" },
      acciones,
    );
    expect(registro).toEqual({
      integranteId: "tomi",
      accionId: "casa",
      puntos: 3,
      motivo: "Poner casa",
    });
  });

  it("no permite usar asistir o faltar fuera de una juntada", () => {
    expect(() =>
      calcularPuntosDeAccionSuelta(
        { fecha: "2026-04-02", integranteId: "tomi", accionId: "faltar" },
        acciones,
      ),
    ).toThrow(ErrorDeDominio);
  });
});
