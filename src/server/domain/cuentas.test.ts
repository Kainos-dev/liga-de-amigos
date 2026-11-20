import { describe, expect, it } from "vitest";
import {
  despuesDeUnIntentoFallido,
  esquemaCrearCuenta,
  MAX_INTENTOS_FALLIDOS,
  MINUTOS_DE_BLOQUEO,
} from "./cuentas";

const valida = {
  usuario: "tomi_el.tano",
  pin: "123456",
  nombre: "Tomi",
  avatarEmoji: "🧉",
  avatarColor: "naranja",
};

/** Primer mensaje de error, o null si los datos son válidos. */
function error(datos: Record<string, unknown>) {
  const resultado = esquemaCrearCuenta.safeParse(datos);
  return resultado.success ? null : resultado.error.issues[0].message;
}

describe("esquemaCrearCuenta", () => {
  it("acepta una cuenta válida", () => {
    expect(error(valida)).toBeNull();
  });

  it("recorta espacios del usuario y el nombre", () => {
    const resultado = esquemaCrearCuenta.parse({ ...valida, usuario: " tomi ", nombre: " Tomi " });
    expect(resultado.usuario).toBe("tomi");
    expect(resultado.nombre).toBe("Tomi");
  });

  it("rechaza usuarios con espacios o símbolos", () => {
    expect(error({ ...valida, usuario: "tomi tano" })).toMatch(/solo puede tener/);
    expect(error({ ...valida, usuario: "tomi@" })).toMatch(/solo puede tener/);
  });

  it("rechaza usuarios muy cortos", () => {
    expect(error({ ...valida, usuario: "to" })).toMatch(/al menos 3/);
  });

  it("pide un PIN de al menos 6 caracteres", () => {
    expect(error({ ...valida, pin: "1234" })).toMatch(/al menos 6/);
  });

  it("solo acepta emojis y colores de la lista", () => {
    expect(error({ ...valida, avatarEmoji: "💩" })).toMatch(/emoji/);
    expect(error({ ...valida, avatarColor: "verde" })).toMatch(/color/);
  });

  it("no acepta un nombre vacío", () => {
    expect(error({ ...valida, nombre: "   " })).toMatch(/nombre/);
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
