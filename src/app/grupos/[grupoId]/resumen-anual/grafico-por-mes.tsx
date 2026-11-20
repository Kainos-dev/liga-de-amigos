/**
 * Juntadas por mes: 12 barras de una sola serie.
 * - Un solo color (naranja, contraste 4,7:1 contra la tarjeta), sin leyenda.
 * - Barras de hasta 24px, punta redondeada y base recta sobre una línea fina.
 * - Etiqueta solo en el valor más alto; el resto, al pasar el mouse o en la tabla.
 * - Los meses que todavía no pasaron se ven apagados (no son "flojos").
 */
const INICIALES = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const ALTO = 96; // px del área de barras

export function GraficoPorMes({
  juntadasPorMes,
  mesesTranscurridos,
}: {
  juntadasPorMes: number[];
  mesesTranscurridos: number;
}) {
  const maximo = Math.max(1, ...juntadasPorMes);
  const indiceMaximo = juntadasPorMes.indexOf(Math.max(...juntadasPorMes));

  return (
    <figure className="space-y-3 rounded-xl bg-card p-4">
      <figcaption className="font-heading font-semibold">Juntadas por mes</figcaption>

      <div className="grid grid-cols-12 gap-0.5" aria-hidden>
        {juntadasPorMes.map((cantidad, i) => {
          const futuro = i >= mesesTranscurridos;
          const alto = cantidad === 0 ? 0 : Math.max(4, (cantidad / maximo) * ALTO);
          return (
            <div
              key={i}
              className="group relative flex flex-col items-center justify-end"
              style={{ height: ALTO + 20 }}
              title={`${MESES[i]}: ${cantidad} ${cantidad === 1 ? "juntada" : "juntadas"}`}
            >
              {i === indiceMaximo && cantidad > 0 && (
                <span className="font-heading mb-1 text-xs font-semibold tabular-nums">{cantidad}</span>
              )}
              <span
                className={`w-full max-w-6 rounded-t-[4px] bg-naranja transition-opacity group-hover:opacity-80 ${futuro ? "opacity-30" : ""}`}
                style={{ height: alto }}
              />
            </div>
          );
        })}
      </div>
      {/* Línea de base, fina y discreta. */}
      <div className="-mt-3 h-px bg-border" aria-hidden />
      <div className="grid grid-cols-12 gap-0.5 text-center text-[11px] text-muted-foreground" aria-hidden>
        {INICIALES.map((inicial, i) => (
          <span key={i}>{inicial}</span>
        ))}
      </div>

      {/* Vista en tabla: accesible para lectores de pantalla y para ver los números exactos. */}
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">Ver como tabla</summary>
        <table className="mt-2 w-full">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="font-normal">Mes</th>
              <th className="text-right font-normal">Juntadas</th>
            </tr>
          </thead>
          <tbody>
            {juntadasPorMes.map((cantidad, i) => (
              <tr key={i} className={i >= mesesTranscurridos ? "text-muted-foreground" : ""}>
                <td className="first-letter:uppercase">{MESES[i]}</td>
                <td className="text-right tabular-nums">{i >= mesesTranscurridos ? "–" : cantidad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
