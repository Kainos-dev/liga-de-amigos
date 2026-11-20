// Avatares: la foto de perfil o, si no hay, la inicial del nombre sobre un color.
import { colorDeAvatar, inicial } from "@/lib/avatares";

const TAMANOS = {
  chico: "size-9 text-base",
  mediano: "size-12 text-xl",
  grande: "size-20 text-4xl",
};

export function Avatar({
  nombre,
  fotoUrl,
  tamano = "chico",
}: {
  nombre: string;
  fotoUrl: string | null;
  tamano?: keyof typeof TAMANOS;
}) {
  if (fotoUrl) {
    return (
      // Imagen chica que ya viene recortada y achicada: alcanza con <img>,
      // no hace falta el optimizador de next/image.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fotoUrl}
        alt=""
        loading="lazy"
        className={`shrink-0 rounded-full bg-muted object-cover ${TAMANOS[tamano]}`}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-heading font-bold ${colorDeAvatar(nombre)} ${TAMANOS[tamano]}`}
    >
      {inicial(nombre)}
    </span>
  );
}
