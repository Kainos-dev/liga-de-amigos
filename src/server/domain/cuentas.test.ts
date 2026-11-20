import { describe, expect, it } from "vitest";
import {
  despuesDeUnIntentoFallido,
  esquemaCrearCuenta,
  esquemaIniciarSesion,
  MAX_INTENTOS_FALLIDOS,
  MINUTOS_DE_BLOQUEO,
  normalizarNombre,
} from "./cuentas";

const valida = { nombre: "El Tano", pin: "123456" };

/** Primer mensaje de error, o null si los datos son válidos. */
function error(datos: Record<string, unknown>) {
  const resultado = esquemaCrearCuenta.safeParse(datos);
  return resultado.success ? null : resultado.error.issues[0].message;
}

describe("esquemaCrearCuenta", () => {
  it("acepta un nombre con espacios, tildes y lo que quieras", () => {
    expect(error(valida)).toBeNull();
    expect(error({ ...valida, nombre: "Tomás 🔥" })).toBeNull();
  });

  it("acomoda los espacios del nombre", () => {
    expect(esquemaCrearCuenta.parse({ ...valida, nombre: "  El   Tano " }).nombre).toBe("El Tano");
    expect(normalizarNombre("\tJuli\n")).toBe("Juli");
  });

  it("pide al menos 2 caracteres y como mucho 30", () => {
    expect(error({ ...valida, nombre: " J " })).toMatch(/al menos 2/);
    expect(error({ ...valida, nombre: "x".repeat(31) })).toMatch(/hasta 30/);
  });

  it("pide un PIN de al menos 6 caracteres", () => {
    expect(error({ ...valida, pin: "1234" })).toMatch(/al menos 6/);
  });
});

describe("esquemaIniciarSesion", () => {
  it("normaliza el nombre igual que al crear la cuenta", () => {
    expect(esquemaIniciarSesion.parse({ nombre: " el  tano ", pin: "x" }).nombre).toBe("el tano");
  });
});

describe("despuesDeUnIntentoFallido", () => {
  const ahora = new Date("2026-11-20T12:00:00Z");

  it("suma el intento sin bloquear mientras no llegue al máximo", () => {
    expect(despuesDeUnIntentoFallido(0, ahora)).toEqual({ intentos: 1, bloqueadoHasta: null });
  });

  it("al llegar al máximo bloquea y reinicia el contador", () => {
    const resultado = despuesDeUnIntentoFallido(MAX_INTENTOS_FALLIDOS - 1, ahora);
    expect(resultado.intentos).toBe(0);
    expect(resultado.bloqueadoHasta?.getTime()).toBe(
      ahora.getTime() + MINUTOS_DE_BLOQUEO * 60_000,
    );
  });
});
