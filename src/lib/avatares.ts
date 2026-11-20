/**
 * Avatar sin foto: la inicial del nombre sobre un color de la paleta.
 * El color se calcula a partir del nombre, así a cada persona le toca siempre
 * el mismo en todas las pantallas (no se guarda en la base).
 * Se usa en el servidor y en el navegador, por eso vive en src/lib.
 */

/** Fondos posibles (siempre tokens de la paleta) con un texto que contraste. */
const COLORES = [
  "bg-naranja text-violeta-oscuro",
  "bg-amarillo text-violeta-oscuro",
  "bg-secondary text-crema",
  "bg-crema text-violeta-oscuro",
] as const;

/** Mismo nombre → mismo color. Suma simple de los caracteres (alcanza para esto). */
export function colorDeAvatar(nombre: string): (typeof COLORES)[number] {
  let suma = 0;
  for (const caracter of nombre.trim().toLowerCase()) suma += caracter.codePointAt(0) ?? 0;
  return COLORES[suma % COLORES.length];
}

/** Primera letra del nombre en mayúscula ("tomi" → "T"). Respeta letras con tilde y emojis. */
export function inicial(nombre: string): string {
  const [primera = "?"] = nombre.trim();
  return primera.toUpperCase();
}
