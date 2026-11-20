import { describe, expect, it } from "vitest";
import type { ResumenAnual } from "@/server/domain/resumenes";
import type { VistaAnual } from "@/server/services/resumenes";
import { armarDiapositivas } from "./diapositivas";

const personas = {
  ana: { nombre: "Ana", fotoUrl: null },
  beto: { nombre: "Beto", fotoUrl: null },
};

function vista(cambios: Partial<ResumenAnual>, cerrada = false): VistaAnual {
  const resumen: ResumenAnual = {
    anio: 2026,
    hayActividad: true,
    juntadas: 0,
    juntadasPorMes: Array(12).fill(0),
    mesesTranscurridos: 11,
    mesMasActivo: null,
    mesMenosActivo: null,
    promedioDeAsistentes: null,
    campeon: null,
    masConstante: null,
    masAsistencia: null,
    desastre: null,
    porAccion: [],
    posicionInicial: null,
    mayorAscenso: null,
    mayorDescenso: null,
    ...cambios,
  };
  return { resumen, personas, cerrada, temporadas: [2026], puedeCerrar: false };
}

const tipos = (v: VistaAnual) => armarDiapositivas(v, "Los de Siempre").map((d) => d.tipo === "persona" ? d.etiqueta : d.tipo);

describe("armarDiapositivas", () => {
  it("sin datos, solo la intro (no se inventa nada)", () => {
    expect(tipos(vista({}))).toEqual(["intro"]);
  });

  it("incluye cada pantalla solo si hay datos", () => {
    const v = vista({
      juntadas: 5,
      masAsistencia: { integranteIds: ["ana"], valor: 5 },
      desastre: { integranteIds: ["beto"], valor: -4 },
      campeon: { integranteIds: ["ana"], valor: 20 },
    });
    expect(tipos(v)).toEqual(["intro", "numero", "El más presente", "El desastre del año", "final"]);
  });

  it("no repite la constancia si es la misma persona que la más presente", () => {
    const mismo = vista({
      masAsistencia: { integranteIds: ["ana"], valor: 5 },
      masConstante: { integranteIds: ["ana"], valor: 100 },
    });
    expect(tipos(mismo)).not.toContain("El más constante");

    const distinto = vista({
      masAsistencia: { integranteIds: ["ana"], valor: 5 },
      masConstante: { integranteIds: ["beto"], valor: 100 },
    });
    expect(tipos(distinto)).toContain("El más constante");
  });

  it("como mucho dos acciones destacadas", () => {
    const accion = (n: string) => ({ accionId: n, nombre: n, integranteIds: ["ana"], valor: 2 });
    const v = vista({ porAccion: [accion("Cocinar"), accion("Poner casa"), accion("Organizar")] });
    expect(tipos(v)).toEqual(["intro", "Más veces: Cocinar", "Más veces: Poner casa"]);
  });

  it("el final dice 'Va primero' en curso y 'Amigo del año' al cerrar", () => {
    const campeon = { campeon: { integranteIds: ["ana"], valor: 20 } };
    const enCurso = armarDiapositivas(vista(campeon), "G").at(-1);
    const cerrada = armarDiapositivas(vista(campeon, true), "G").at(-1);
    expect(enCurso?.tipo === "final" && enCurso.etiqueta).toBe("Va primero");
    expect(cerrada?.tipo === "final" && cerrada.etiqueta).toBe("Amigo del año");
  });
});
