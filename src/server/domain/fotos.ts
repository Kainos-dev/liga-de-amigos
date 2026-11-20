/**
 * Validación de fotos de perfil. El navegador las manda ya achicadas, pero
 * el servidor no confía: revisa el tamaño y que el contenido sea de verdad
 * una imagen (por sus primeros bytes, no por lo que diga el encabezado).
 */
import { ErrorDeDominio } from "./errores";

/** Una foto de 256x256 pesa ~20 KB; 300 KB deja margen de sobra. */
export const TAMANO_MAXIMO_DE_FOTO = 300_000;

export type TipoDeFoto = "image/jpeg" | "image/png" | "image/webp";

/** Detecta el formato real por la "firma" de los primeros bytes. */
export function tipoReal(bytes: Uint8Array): TipoDeFoto | null {
  const empieza = (...firma: number[]) => firma.every((b, i) => bytes[i] === b);
  if (empieza(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (empieza(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  // WebP: "RIFF" + 4 bytes de tamaño + "WEBP"
  if (empieza(0x52, 0x49, 0x46, 0x46) && [0x57, 0x45, 0x42, 0x50].every((b, i) => bytes[8 + i] === b)) {
    return "image/webp";
  }
  return null;
}

export function validarFoto(bytes: Uint8Array): TipoDeFoto {
  if (bytes.length === 0) {
    throw new ErrorDeDominio("No llegó ninguna imagen");
  }
  if (bytes.length > TAMANO_MAXIMO_DE_FOTO) {
    throw new ErrorDeDominio("La foto es muy pesada. Probá con otra");
  }
  const tipo = tipoReal(bytes);
  if (!tipo) {
    throw new ErrorDeDominio("El archivo no es una imagen JPG, PNG o WebP");
  }
  return tipo;
}
