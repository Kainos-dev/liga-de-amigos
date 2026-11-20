/**
 * Lluvia de papelitos con los colores de la marca. Solo CSS (clase .confeti
 * en globals.css), sin librerías. Cae una vez y desaparece; con "reducir
 * movimiento" no se ve. Las posiciones salen de una cuenta fija (no al azar)
 * para que el servidor y el navegador dibujen exactamente lo mismo.
 */
const COLORES = ["bg-naranja", "bg-amarillo", "bg-crema", "bg-secondary"];

export function Confeti({ cantidad = 36, fijo = false }: { cantidad?: number; fijo?: boolean }) {
  const papelitos = Array.from({ length: cantidad }, (_, i) => {
    const semilla = (i * 37) % 100;
    return {
      izquierda: `${(i * 61) % 100}%`,
      ancho: 6 + (semilla % 6),
      alto: 10 + (semilla % 9),
      color: COLORES[i % COLORES.length],
      duracion: `${2.4 + (semilla % 25) / 10}s`,
      demora: `${(semilla % 12) / 10}s`,
    };
  });

  return (
    <div
      aria-hidden
      className={`pointer-events-none inset-0 z-50 overflow-hidden ${fijo ? "fixed" : "absolute"}`}
    >
      {papelitos.map((p, i) => (
        <span
          key={i}
          className={`confeti absolute -top-5 rounded-[2px] ${p.color}`}
          style={{
            left: p.izquierda,
            width: p.ancho,
            height: p.alto,
            animationDuration: p.duracion,
            animationDelay: p.demora,
          }}
        />
      ))}
    </div>
  );
}
