/**
 * Fondo de toda la app: dos resplandores difusos (naranja y amarillo) que se
 * mueven muy despacio y una textura de grano fino. Queda fijo detrás del
 * contenido y no recibe toques. Es decoración: los lectores de pantalla lo ignoran.
 */
export function Fondo() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -top-32 -right-28 size-[22rem] rounded-full blur-md"
        style={{
          background: "radial-gradient(circle, color-mix(in oklab, var(--naranja) 45%, transparent), transparent 70%)",
          animation: "flotar 16s ease-in-out infinite",
        }}
      />
      <div
        className="absolute top-[45%] -left-40 size-[24rem] rounded-full blur-md"
        style={{
          background: "radial-gradient(circle, color-mix(in oklab, var(--amarillo) 22%, transparent), transparent 70%)",
          animation: "flotar 22s ease-in-out infinite reverse",
        }}
      />
      {/* Grano: ruido generado por el propio navegador (sin imágenes). */}
      <svg className="absolute inset-0 size-full opacity-[0.08] mix-blend-overlay">
        <filter id="grano-de-fondo">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grano-de-fondo)" />
      </svg>
    </div>
  );
}
