import { describe, expect, it } from "vitest";
import {
  type DatosDeTemporada,
  lideres,
  primerDiaDelMesSiguiente,
  resumenAnual,
  resumenMensual,
} from "./resumenes";

/** Arma datos de prueba de forma legible. */
function temporada() {
  const datos: DatosDeTemporada = {
    integrantes: [
      { id: "ana", nombre: "Ana" },
      { id: "beto", nombre: "Beto" },
      { id: "caro", nombre: "Caro" },
    ],
    juntadas: [],
    participaciones: [],
    registros: [],
    acciones: [
      { id: "asistir", nombre: "Asistir", clave: "asistir" },
      { id: "faltar", nombre: "Faltar", clave: "faltar" },
      { id: "casa", nombre: "Poner casa", clave: null },
      { id: "cocinar", nombre: "Cocinar", clave: null },
      { id: "tarde", nombre: "Llegar muy tarde", clave: null },
    ],
  };

  /** Juntada con quiénes fueron, quiénes faltaron y acciones extra. */
  function juntada(
    fecha: string,
    fueron: string[],
    faltaron: string[] = [],
    extras: { quien: string; accion: string; puntos: number }[] = [],
  ) {
    const id = `j${datos.juntadas.length + 1}`;
    datos.juntadas.push({ id, fecha, titulo: null });
    for (const quien of fueron) {
      datos.participaciones.push({ juntadaId: id, integranteId: quien, estado: "asistio" });
      datos.registros.push({ integranteId: quien, accionId: "asistir", clave: "asistir", puntos: 3, fecha });
    }
    for (const quien of faltaron) {
      datos.participaciones.push({ juntadaId: id, integranteId: quien, estado: "ausente_confirmado" });
      datos.registros.push({ integranteId: quien, accionId: "faltar", clave: "faltar", puntos: -1, fecha });
    }
    for (const extra of extras) {
      datos.registros.push({ integranteId: extra.quien, accionId: extra.accion, clave: null, puntos: extra.puntos, fecha });
    }
    return id;
  }

  return { datos, juntada };
}

describe("lideres", () => {
  it("devuelve a todos los que empatan en el máximo", () => {
    expect(lideres(new Map([["a", 3], ["b", 3], ["c", 1]]))).toEqual({ integranteIds: ["a", "b"], valor: 3 });
  });

  it("si nadie sumó, no hay destacado (no se inventan ganadores)", () => {
    expect(lideres(new Map([["a", 0], ["b", 0]]))).toBeNull();
    expect(lideres(new Map())).toBeNull();
  });

  it("en sentido 'menor' busca el más negativo", () => {
    expect(lideres(new Map([["a", -1], ["b", -4], ["c", 2]]), "menor")).toEqual({ integranteIds: ["b"], valor: -4 });
    expect(lideres(new Map([["a", 2]]), "menor")).toBeNull();
  });
});

describe("primerDiaDelMesSiguiente", () => {
  it("pasa de mes y de año", () => {
    expect(primerDiaDelMesSiguiente("2026-03")).toBe("2026-04-01");
    expect(primerDiaDelMesSiguiente("2026-12")).toBe("2027-01-01");
  });
});

describe("resumenMensual", () => {
  it("un mes sin nada: sin actividad y sin destacados", () => {
    const { datos } = temporada();
    const resumen = resumenMensual(datos, "2026-05");
    expect(resumen.hayActividad).toBe(false);
    expect(resumen.figura).toBeNull();
    expect(resumen.masAsistencia).toBeNull();
    expect(resumen.porAccion).toEqual([]);
    expect(resumen.promedioDeAsistentes).toBeNull();
  });

  it("calcula figura, asistencia, desastre y destacados por acción del mes", () => {
    const { datos, juntada } = temporada();
    juntada("2026-05-02", ["ana", "beto"], ["caro"], [{ quien: "ana", accion: "casa", puntos: 3 }]);
    juntada("2026-05-16", ["ana"], ["beto", "caro"], [
      { quien: "ana", accion: "cocinar", puntos: 2 },
      { quien: "caro", accion: "tarde", puntos: -2 },
    ]);
    juntada("2026-06-01", ["beto", "caro"]); // otro mes: no cuenta

    const resumen = resumenMensual(datos, "2026-05");
    expect(resumen.juntadas).toBe(2);
    expect(resumen.figura).toEqual({ integranteIds: ["ana"], valor: 11 });
    expect(resumen.masAsistencia).toEqual({ integranteIds: ["ana"], valor: 2 });
    expect(resumen.desastre).toEqual({ integranteIds: ["caro"], valor: -4 });
    expect(resumen.porAccion.map((d) => [d.nombre, d.integranteIds, d.valor])).toEqual([
      ["Poner casa", ["ana"], 1],
      ["Cocinar", ["ana"], 1],
    ]);
    expect(resumen.promedioDeAsistentes).toBe(1.5);
    expect(resumen.juntadaMasConcurrida?.asistentes).toBe(2);
  });

  it("con una sola juntada no hay 'juntada más concurrida'", () => {
    const { datos, juntada } = temporada();
    juntada("2026-05-02", ["ana", "beto"]);
    expect(resumenMensual(datos, "2026-05").juntadaMasConcurrida).toBeNull();
  });

  it("subidas y bajadas respecto del inicio del mes", () => {
    const { datos, juntada } = temporada();
    juntada("2026-04-10", ["beto"], [], [{ quien: "beto", accion: "casa", puntos: 3 }]); // abril: Beto 1º
    juntada("2026-05-10", ["ana", "caro"], [], [{ quien: "ana", accion: "casa", puntos: 3 }, { quien: "ana", accion: "cocinar", puntos: 2 }]);

    const resumen = resumenMensual(datos, "2026-05");
    // Abril: Beto 1º, Ana y Caro 2º. Mayo: Ana 1º (8), Beto 2º (6), Caro 3º (3).
    expect(resumen.mayorSubida).toEqual({ integranteIds: ["ana"], valor: 1 });
    expect(resumen.mayorBajada).toEqual({ integranteIds: ["beto", "caro"], valor: -1 });
  });

  it("en el primer mes con puntos no hay subidas ni bajadas", () => {
    const { datos, juntada } = temporada();
    juntada("2026-05-10", ["ana"]);
    const resumen = resumenMensual(datos, "2026-05");
    expect(resumen.mayorSubida).toBeNull();
    expect(resumen.mayorBajada).toBeNull();
  });
});

describe("resumenAnual", () => {
  it("cuenta juntadas por mes y encuentra el mes más y menos activo", () => {
    const { datos, juntada } = temporada();
    juntada("2026-01-10", ["ana"]);
    juntada("2026-03-10", ["ana"]);
    juntada("2026-03-20", ["beto"]);

    const resumen = resumenAnual(datos, 2026, "2026-04-15");
    expect(resumen.juntadasPorMes.slice(0, 4)).toEqual([1, 0, 2, 0]);
    expect(resumen.mesesTranscurridos).toBe(4);
    expect(resumen.mesMasActivo).toEqual({ meses: [3], juntadas: 2 });
    expect(resumen.mesMenosActivo).toEqual({ meses: [2, 4], juntadas: 0 });
  });

  it("los meses que todavía no pasaron no cuentan como flojos", () => {
    const { datos, juntada } = temporada();
    juntada("2026-01-10", ["ana"]);
    const resumen = resumenAnual(datos, 2026, "2026-01-20");
    expect(resumen.mesesTranscurridos).toBe(1);
    expect(resumen.mesMenosActivo).toBeNull(); // un solo mes: no hay "flojo"
  });

  it("campeón, constancia con mínimo de juntadas y movimientos del año", () => {
    const { datos, juntada } = temporada();
    // Enero: Beto arranca arriba.
    juntada("2026-01-10", ["beto"], ["ana"], [{ quien: "beto", accion: "casa", puntos: 3 }]);
    // Después Ana no falta nunca más y pasa al frente.
    juntada("2026-02-10", ["ana", "beto"]);
    juntada("2026-03-10", ["ana"], ["beto"], [{ quien: "ana", accion: "casa", puntos: 3 }]);
    juntada("2026-04-10", ["ana", "caro"]);

    const resumen = resumenAnual(datos, 2026, "2026-12-31");
    expect(resumen.campeon).toEqual({ integranteIds: ["ana"], valor: 11 });
    // Ana: fue 3, faltó 1 → 75%. Beto: fue 2, faltó 1 → 67%. Caro: 1 juntada, no compite.
    expect(resumen.masConstante).toEqual({ integranteIds: ["ana"], valor: 75 });
    expect(resumen.posicionInicial).toEqual({ beto: 1, caro: 2, ana: 3 });
    expect(resumen.mayorAscenso).toEqual({ integranteIds: ["ana"], valor: 2 });
    expect(resumen.porAccion.find((d) => d.nombre === "Poner casa")?.integranteIds.sort()).toEqual(["ana", "beto"]);
  });

  it("una temporada sin nada no tiene campeón ni destacados", () => {
    const { datos } = temporada();
    const resumen = resumenAnual(datos, 2026, "2026-12-31");
    expect(resumen.hayActividad).toBe(false);
    expect(resumen.campeon).toBeNull();
    expect(resumen.mesMasActivo).toBeNull();
    expect(resumen.masConstante).toBeNull();
    expect(resumen.posicionInicial).toBeNull();
  });
});
