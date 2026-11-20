import { describe, expect, it } from "vitest";
import { cifrarPin, hashDeToken, nuevoTokenDeSesion, verificarPin } from "./credenciales";

describe("PIN", () => {
  it("verifica el PIN correcto y rechaza otro", async () => {
    const guardado = await cifrarPin("123456");
    expect(await verificarPin("123456", guardado)).toBe(true);
    expect(await verificarPin("123457", guardado)).toBe(false);
  });

  it("no guarda el PIN en texto plano y usa sal distinta cada vez", async () => {
    const a = await cifrarPin("123456");
    const b = await cifrarPin("123456");
    expect(a).not.toContain("123456");
    expect(a).not.toBe(b);
  });

  it("rechaza un valor guardado con formato inválido", async () => {
    expect(await verificarPin("123456", "cualquier-cosa")).toBe(false);
  });
});

describe("tokens de sesión", () => {
  it("genera tokens distintos y su hash es estable", () => {
    const token = nuevoTokenDeSesion();
    expect(token).not.toBe(nuevoTokenDeSesion());
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect(hashDeToken(token)).toBe(hashDeToken(token));
    expect(hashDeToken(token)).not.toBe(token);
  });
});
