import { describe, expect, it } from "vitest";
import { colorDeAvatar, inicial } from "./avatares";

describe("avatar sin foto", () => {
  it("el mismo nombre da siempre el mismo color", () => {
    expect(colorDeAvatar("Tomi")).toBe(colorDeAvatar("Tomi"));
    expect(colorDeAvatar(" tomi ")).toBe(colorDeAvatar("Tomi"));
  });

  it("distintos nombres reparten colores", () => {
    const colores = new Set(["Ana", "Beto", "Caro", "Juli", "Nico", "Tomi", "Pau", "Lu"].map(colorDeAvatar));
    expect(colores.size).toBeGreaterThan(1);
  });

  it("la inicial es la primera letra en mayúscula", () => {
    expect(inicial("tomi")).toBe("T");
    expect(inicial("  Ñato")).toBe("Ñ");
    expect(inicial("éli")).toBe("É");
    expect(inicial("🔥Fuego")).toBe("🔥");
    expect(inicial("")).toBe("?");
  });
});
