// Avatares: la foto de perfil o, si no hay, la inicial del nombre sobre un color.
import { colorDeAvatar, inicial } from "@/lib/avatares";

const TAMANOS = {
  mini: "size-6 text-[11px]",
  chico: "size-9 text-base",
  mediano: "size-12 text-xl",
  grande: "size-20 text-4xl",
  podio: "size-16 text-2xl",
  enorme: "size-28 text-5xl",
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

/** Varios avatares encimados ("los que fueron"), con un "+N" si son muchos. */
export function AvataresApilados({
  personas,
  maximo = 5,
}: {
  personas: { nombre: string; fotoUrl: string | null }[];
  maximo?: number;
}) {
  const visibles = personas.slice(0, maximo);
  const resto = personas.length - visibles.length;
  return (
    <div className="flex pl-1.5">
      {visibles.map((p, i) => (
        <span key={`${p.nombre}-${i}`} className="-ml-1.5 rounded-full ring-2 ring-card">
          <Avatar nombre={p.nombre} fotoUrl={p.fotoUrl} tamano="mini" />
        </span>
      ))}
      {resto > 0 && (
        <span className="-ml-1.5 flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold ring-2 ring-card">
          +{resto}
        </span>
      )}
    </div>
  );
}
