import { describe, expect, it } from "vitest";
import { ErrorDeDominio } from "./errores";
import { TAMANO_MAXIMO_DE_FOTO, tipoReal, validarFoto } from "./fotos";

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50, 0]);

describe("fotos de perfil", () => {
  it("reconoce JPEG, PNG y WebP por su contenido", () => {
    expect(tipoReal(jpeg)).toBe("image/jpeg");
    expect(tipoReal(png)).toBe("image/png");
    expect(tipoReal(webp)).toBe("image/webp");
  });

  it("rechaza lo que no es imagen aunque diga serlo", () => {
    const texto = new TextEncoder().encode("<script>alert(1)</script>");
    expect(() => validarFoto(texto)).toThrow(/no es una imagen/);
  });

  it("rechaza archivos vacíos o muy pesados", () => {
    expect(() => validarFoto(new Uint8Array())).toThrow(ErrorDeDominio);
    const pesada = new Uint8Array(TAMANO_MAXIMO_DE_FOTO + 1);
    pesada.set(jpeg);
    expect(() => validarFoto(pesada)).toThrow(/pesada/);
  });
});
