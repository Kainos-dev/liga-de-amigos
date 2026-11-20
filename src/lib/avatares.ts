/**
 * Opciones de avatar (emoji + color de fondo). Se usan en el servidor para
 * validar y en el navegador para mostrar el selector, por eso viven en src/lib.
 */

export const EMOJIS_DE_AVATAR = [
  "😎", "🤠", "🥸", "🤓", "😈", "👻", "🤡", "👽",
  "🦁", "🐯", "🐻", "🐼", "🦊", "🐸", "🐙", "🦄",
  "🍕", "🍔", "🌮", "🍺", "🍷", "🧉", "⚽", "🎸",
] as const;

/** Clave del color → clase de Tailwind (siempre tokens de la paleta). */
export const COLORES_DE_AVATAR = {
  naranja: "bg-naranja",
  amarillo: "bg-amarillo",
  violeta: "bg-secondary",
  crema: "bg-crema",
} as const;

export type ColorDeAvatar = keyof typeof COLORES_DE_AVATAR;

export const CLAVES_DE_COLOR = Object.keys(COLORES_DE_AVATAR) as ColorDeAvatar[];
