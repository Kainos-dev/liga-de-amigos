// Avatares de cuentas e integrantes.
import { COLORES_DE_AVATAR, type ColorDeAvatar } from "@/lib/avatares";

const TAMANOS = {
  chico: "size-9 text-lg",
  mediano: "size-12 text-2xl",
  grande: "size-20 text-4xl",
};

/**
 * Avatar de un integrante: el de su cuenta, o la inicial del nombre en un
 * círculo neutro si no tiene cuenta.
 */
export function AvatarDeIntegrante({
  nombre,
  emoji,
  color,
  tamano = "chico",
}: {
  nombre: string;
  emoji: string | null;
  color: string | null;
  tamano?: keyof typeof TAMANOS;
}) {
  if (emoji && color) return <Avatar emoji={emoji} color={color} tamano={tamano} />;
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-muted font-heading font-semibold text-muted-foreground ${TAMANOS[tamano]}`}
    >
      {nombre.charAt(0).toUpperCase()}
    </span>
  );
}

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
