import { describe, expect, it } from "vitest";
import { ErrorDeDominio } from "./errores";
import {
  esquemaSolicitarIngreso,
  generarCodigo,
  LARGO_DE_CODIGO,
  normalizarCodigo,
  validarQueQuedeUnAdmin,
} from "./grupos";

describe("código de grupo", () => {
  it("tiene 6 caracteres sin letras ni números que se confundan", () => {
    for (let i = 0; i < 200; i++) {
      const codigo = generarCodigo();
      expect(codigo).toHaveLength(LARGO_DE_CODIGO);
      expect(codigo).toMatch(/^[A-Z0-9]+$/);
      expect(codigo).not.toMatch(/[0O1IL5S]/);
    }
  });

  it("normaliza lo que escribe la gente", () => {
    expect(normalizarCodigo(" k7m 2qx ")).toBe("K7M2QX");
    expect(normalizarCodigo("K7M-2QX")).toBe("K7M2QX");
  });

  it("el esquema acepta el código escrito de cualquier forma", () => {
    expect(esquemaSolicitarIngreso.parse({ codigo: "k7m-2qx" })).toEqual({ codigo: "K7M2QX" });
    expect(esquemaSolicitarIngreso.safeParse({ codigo: "K7M" }).success).toBe(false);
  });
});

describe("validarQueQuedeUnAdmin", () => {
  it("no deja quitarle el rol al único administrador", () => {
    expect(() =>
      validarQueQuedeUnAdmin({ rolActual: "admin", rolNuevo: "miembro" }, 1),
    ).toThrow(ErrorDeDominio);
  });

  it("no deja sacar del grupo al único administrador", () => {
    expect(() => validarQueQuedeUnAdmin({ rolActual: "admin", rolNuevo: null }, 1)).toThrow(
      ErrorDeDominio,
    );
  });

  it("permite el cambio si hay otro administrador", () => {
    expect(() =>
      validarQueQuedeUnAdmin({ rolActual: "admin", rolNuevo: "miembro" }, 2),
    ).not.toThrow();
  });

  it("los cambios de miembros no dependen de los administradores", () => {
    expect(() => validarQueQuedeUnAdmin({ rolActual: "miembro", rolNuevo: null }, 1)).not.toThrow();
    expect(() =>
      validarQueQuedeUnAdmin({ rolActual: "miembro", rolNuevo: "admin" }, 1),
    ).not.toThrow();
  });
});
