import { COLORES_DE_AVATAR, type ColorDeAvatar } from "@/lib/avatares";

const TAMANOS = {
  chico: "size-9 text-lg",
  mediano: "size-12 text-2xl",
  grande: "size-20 text-4xl",
};

export function Avatar({
  emoji,
  color,
  tamano = "mediano",
}: {
  emoji: string;
  color: string;
  tamano?: keyof typeof TAMANOS;
}) {
  // Si llegara un color desconocido, usamos el violeta para no romper la vista.
  const fondo = COLORES_DE_AVATAR[color as ColorDeAvatar] ?? COLORES_DE_AVATAR.violeta;

  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${fondo} ${TAMANOS[tamano]}`}
    >
      {emoji}
    </span>
  );
}
