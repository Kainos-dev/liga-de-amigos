"use client";

import { Crown, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/avatar";
import { Contador } from "@/components/contador";
import { conSigno } from "@/lib/fechas";
import type { FilaDeLaLiga } from "@/server/services/tabla";

/**
 * Podio de los 3 primeros + el resto de la tabla. Tocar a alguien abre su
 * "figurita": una carta con su foto, puesto, puntos, asistencia y desglose.
 */
export function TablaInteractiva({
  filas,
  acciones,
  miIntegranteId,
}: {
  filas: FilaDeLaLiga[];
  acciones: Record<string, string>;
  miIntegranteId: string;
}) {
  const [elegida, setElegida] = useState<FilaDeLaLiga | null>(null);
  const hayPuntos = filas.some((f) => f.puntos !== 0);
  const podio = hayPuntos ? filas.slice(0, 3) : [];
  const resto = hayPuntos ? filas.slice(3) : filas;

  return (
    <>
      {podio.length > 0 && <Podio filas={podio} alElegir={setElegida} />}

      {!hayPuntos && (
        <p className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
          Todavía nadie sumó puntos. El podio aparece con la primera juntada.
        </p>
      )}

      {resto.length > 0 && (
        <ol className="space-y-2" start={podio.length + 1}>
          {resto.map((fila, i) => (
            <li key={fila.integranteId} className="aparece" style={{ animationDelay: `${0.75 + i * 0.06}s` }}>
              <button
                type="button"
                onClick={() => setElegida(fila)}
                aria-label={`Ver la figurita de ${fila.nombre}`}
                className={`presionable flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left relieve ${
                  fila.puntos < 0 ? "border-naranja/35 bg-naranja/10" : "bg-card hover:bg-muted"
                } ${fila.integranteId === miIntegranteId ? "ring-1 ring-amarillo/60" : ""} ${fila.activo ? "" : "opacity-70"}`}
              >
                <span className="font-heading w-6 text-center text-lg font-extrabold text-muted-foreground tabular-nums">
                  {fila.posicion}
                </span>
                <Avatar nombre={fila.nombre} fotoUrl={fila.fotoUrl} />
                <span className="min-w-0 flex-1">
                  <span className="font-heading block truncate font-semibold">
                    {fila.nombre}
                    {fila.integranteId === miIntegranteId && <span className="font-normal text-muted-foreground"> (vos)</span>}
                  </span>
                  {!fila.activo && <span className="block text-xs text-muted-foreground">Ya no está en el grupo</span>}
                </span>
                <Cambio cambio={fila.cambio} />
                <span
                  className={`font-heading w-14 text-right text-lg font-extrabold tabular-nums ${fila.puntos < 0 ? "text-naranja" : ""}`}
                >
                  <Contador valor={fila.puntos} demora={0.35} />
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}

      <p className="text-center text-xs text-muted-foreground">Tocá a alguien para ver su figurita</p>

      <AnimatePresence>
        {elegida && (
          <Figurita
            key={elegida.integranteId}
            fila={elegida}
            acciones={acciones}
            alCerrar={() => setElegida(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/** Los 3 primeros: el 1º en el centro y más alto, con corona. */
function Podio({ filas, alElegir }: { filas: FilaDeLaLiga[]; alElegir: (f: FilaDeLaLiga) => void }) {
  // Orden visual: 2º, 1º, 3º.
  const lugares = [
    { fila: filas[1], alto: "h-24", bloque: "from-crema to-muted-foreground", demora: 0.1 },
    { fila: filas[0], alto: "h-32", bloque: "from-amarillo to-amarillo/75", demora: 0.25 },
    { fila: filas[2], alto: "h-[4.5rem]", bloque: "from-naranja to-naranja/80", demora: 0.4 },
  ];

  return (
    <div className="grid grid-cols-3 items-end gap-2">
      {lugares.map(({ fila, alto, bloque, demora }, i) =>
        fila ? (
          <button
            key={fila.integranteId}
            type="button"
            onClick={() => alElegir(fila)}
            aria-label={`Ver la figurita de ${fila.nombre}`}
            className="presionable flex flex-col items-center gap-2"
          >
            <span className="cae-en-su-lugar flex flex-col items-center" style={{ animationDelay: `${demora + 0.3}s` }}>
              {i === 1 && <Crown aria-hidden className="-mb-1 size-8 fill-amarillo text-violeta-oscuro" strokeWidth={2} />}
              <span className={`rounded-full ring-[3px] ring-offset-[3px] ring-offset-background ${i === 1 ? "ring-amarillo" : i === 0 ? "ring-crema" : "ring-naranja"}`}>
                <Avatar nombre={fila.nombre} fotoUrl={fila.fotoUrl} tamano={i === 1 ? "grande" : "podio"} />
              </span>
            </span>
            <span className="font-heading w-full truncate text-center font-bold">{fila.nombre}</span>
            <span className="font-heading -mt-1.5 text-xl font-extrabold text-amarillo tabular-nums">
              <Contador valor={fila.puntos} demora={demora + 0.2} />
            </span>
            <span
              className={`crece-desde-abajo relative flex w-full justify-center overflow-hidden rounded-t-2xl rounded-b-md bg-linear-to-b pt-2 shadow-[inset_0_1px_0_rgb(255_255_255/35%)] ${alto} ${bloque}`}
              style={{ animationDelay: `${demora}s` }}
            >
              <span aria-hidden className="trama-oscura absolute inset-0" />
              <span className="relative font-display text-5xl leading-none text-violeta-oscuro">{fila.posicion}</span>
            </span>
          </button>
        ) : (
          <span key={i} />
        ),
      )}
    </div>
  );
}

function Cambio({ cambio }: { cambio: number | null }) {
  if (cambio === null || cambio === 0) return null;
  const subio = cambio > 0;
  return (
    <span
      className={`rebota shrink-0 text-xs font-bold tabular-nums ${subio ? "text-amarillo" : "text-naranja"}`}
      aria-label={subio ? `Subió ${cambio} puestos` : `Bajó ${-cambio} puestos`}
    >
      {subio ? "▲" : "▼"}
      {Math.abs(cambio)}
    </span>
  );
}

/** La carta coleccionable de un integrante, que entra dándose vuelta. */
function Figurita({
  fila,
  acciones,
  alCerrar,
}: {
  fila: FilaDeLaLiga;
  acciones: Record<string, string>;
  alCerrar: () => void;
}) {
  // Cerrar con Escape (teclado o lector de pantalla).
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && alCerrar();
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [alCerrar]);

  const desglose = Object.entries(fila.desglose)
    .sort(([, a], [, b]) => Math.abs(b.puntos) - Math.abs(a.puntos))
    .slice(0, 6);
  const negativo = fila.puntos < 0;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        type="button"
        aria-label="Cerrar la figurita"
        onClick={alCerrar}
        className="absolute inset-0 bg-violeta-oscuro/80 backdrop-blur-sm"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Figurita de ${fila.nombre}`}
        className="relative w-full max-w-[19rem] rounded-[1.6rem] bg-crema p-2.5 text-violeta-oscuro shadow-2xl"
        style={{ transformPerspective: 900 }}
        initial={{ rotateY: 80, rotate: -2, scale: 0.9, opacity: 0 }}
        animate={{ rotateY: 0, rotate: -2, scale: 1, opacity: 1 }}
        exit={{ rotateY: -60, scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        <div className="overflow-hidden rounded-2xl border-[3px] border-violeta-oscuro">
          <div className={`relative flex h-48 items-center justify-center ${negativo ? "bg-secondary" : "bg-amarillo"}`}>
            <span aria-hidden className="trama-oscura absolute inset-0" />
            <span className="absolute top-2.5 left-3 font-display text-5xl leading-none [text-shadow:2px_2px_0_var(--crema)]">
              {fila.posicion}º
            </span>
            <span className="relative rounded-full border-4 border-violeta-oscuro">
              <Avatar nombre={fila.nombre} fotoUrl={fila.fotoUrl} tamano="enorme" />
            </span>
          </div>
          <div className="space-y-3 bg-crema px-4 pt-3.5 pb-4">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate font-display text-4xl leading-none tracking-wide">{fila.nombre}</span>
              <span className="font-heading shrink-0 text-2xl font-extrabold tabular-nums">
                {fila.puntos} <span className="text-sm">pts</span>
              </span>
            </div>
            <dl className="grid grid-cols-4 gap-1.5 text-center">
              {[
                ["Fue", fila.asistencias],
                ["Faltó", fila.faltas],
                ["Asist.", fila.porcentajeDeAsistencia === null ? "–" : `${fila.porcentajeDeAsistencia}%`],
                ["Aportes", fila.contribuciones],
              ].map(([titulo, valor]) => (
                <div key={titulo} className="rounded-lg bg-violeta-oscuro py-1.5 text-crema">
                  <dt className="text-[10px] text-muted-foreground">{titulo}</dt>
                  <dd className="font-heading text-base font-extrabold tabular-nums">{valor}</dd>
                </div>
              ))}
            </dl>
            {desglose.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {desglose.map(([accionId, { veces, puntos }]) => (
                  <li key={accionId} className="rounded-full border-[1.5px] border-violeta-oscuro px-2.5 py-0.5 text-xs font-semibold">
                    {acciones[accionId] ?? "Acción"} ×{veces} {conSigno(puntos)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs">Todavía no sumó ni restó puntos.</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={alCerrar}
          aria-label="Cerrar"
          autoFocus
          className="absolute -top-3.5 -right-3.5 flex size-11 items-center justify-center rounded-full border-[3px] border-violeta-oscuro bg-naranja text-violeta-oscuro"
        >
          <X aria-hidden className="size-5" strokeWidth={3} />
        </button>
      </motion.div>
    </motion.div>
  );
}
