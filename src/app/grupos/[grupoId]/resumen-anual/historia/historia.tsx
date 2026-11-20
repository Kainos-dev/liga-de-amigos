"use client";

import { Crown, Share2, X } from "lucide-react";
import {
  AnimatePresence,
  animate,
  motion,
  type MotionValue,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { Confeti } from "@/components/confeti";
import type { Diapositiva, Fondo } from "./diapositivas";

const DURACION = 6; // segundos por pantalla

const FONDOS: Record<Fondo, string> = {
  violeta: "bg-background text-foreground",
  naranja: "bg-naranja text-violeta-oscuro",
  amarillo: "bg-amarillo text-violeta-oscuro",
  oscuro: "bg-violeta-oscuro text-crema",
};

const INICIALES_DE_MES = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/**
 * El "Wrapped" del año: pantallas a pantalla completa, como las historias.
 * - Avanza solo; tocando a la derecha o a la izquierda se pasa o se vuelve.
 * - Se puede deslizar con el dedo, y mantener apretado lo pausa.
 * - Con "reducir movimiento" no avanza solo ni hay transiciones.
 */
export function Historia({
  diapositivas,
  volver,
}: {
  diapositivas: Diapositiva[];
  volver: string;
}) {
  const router = useRouter();
  const quieto = useReducedMotion();
  const [indice, setIndice] = useState(0);
  const [direccion, setDireccion] = useState(1);
  const progreso = useMotionValue(0);
  const control = useRef<ReturnType<typeof animate> | null>(null);
  const actual = diapositivas[indice];

  const ir = useCallback(
    (siguiente: number) => {
      if (siguiente < 0) return;
      if (siguiente >= diapositivas.length) {
        progreso.set(1); // la última queda completa
        return;
      }
      setDireccion(siguiente > indice ? 1 : -1);
      setIndice(siguiente);
    },
    [diapositivas.length, indice, progreso],
  );

  // La barra de la pantalla actual se llena sola; al llenarse, pasa a la siguiente.
  useEffect(() => {
    progreso.set(0);
    if (quieto) return;
    control.current = animate(progreso, 1, {
      duration: DURACION,
      ease: "linear",
      onComplete: () => ir(indice + 1),
    });
    return () => control.current?.stop();
  }, [indice, quieto, progreso, ir]);

  // Teclado: flechas para moverse, Escape para salir.
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") ir(indice + 1);
      if (e.key === "ArrowLeft") ir(indice - 1);
      if (e.key === "Escape") router.push(volver);
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [indice, ir, router, volver]);

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden transition-colors duration-500 ${FONDOS[actual.fondo]}`}>
      {/* Barras de progreso, una por pantalla. */}
      <div className="absolute inset-x-3 top-3 z-20 flex gap-1.5" style={{ top: "max(env(safe-area-inset-top), 0.75rem)" }}>
        {diapositivas.map((_, i) => (
          <BarraDeProgreso key={i} estado={i < indice ? "llena" : i === indice ? "actual" : "vacia"} progreso={progreso} />
        ))}
      </div>
      <Link
        href={volver}
        aria-label="Salir del resumen"
        className="absolute right-3 z-30 flex size-11 items-center justify-center rounded-full"
        style={{ top: "calc(max(env(safe-area-inset-top), 0.75rem) + 0.75rem)" }}
      >
        <X aria-hidden className="size-6" />
      </Link>

      <motion.div
        className="absolute inset-0 touch-pan-y"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.35}
        onDragEnd={(_, info) => {
          if (info.offset.x < -60) ir(indice + 1);
          else if (info.offset.x > 60) ir(indice - 1);
        }}
        onTap={(evento, info) => {
          // Los botones de adentro (compartir, ver tabla) no cuentan como "pasar".
          if ((evento.target as HTMLElement).closest("a,button")) return;
          if (info.point.x < window.innerWidth * 0.35) ir(indice - 1);
          else ir(indice + 1);
        }}
        onPointerDown={() => control.current?.pause()}
        onPointerUp={() => control.current?.play()}
        onPointerCancel={() => control.current?.play()}
      >
        <AnimatePresence mode="popLayout" initial={false} custom={direccion}>
          <motion.div
            key={indice}
            custom={direccion}
            className="absolute inset-0 flex flex-col justify-center px-7"
            initial={quieto ? false : { opacity: 0, x: direccion * 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={quieto ? { opacity: 0 } : { opacity: 0, x: direccion * -80 }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
          >
            <Contenido diapositiva={actual} />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <p className="pointer-events-none absolute inset-x-0 bottom-6 text-center text-xs opacity-70">
        {indice + 1} de {diapositivas.length} · Tocá o deslizá para seguir
      </p>
    </div>
  );
}

function BarraDeProgreso({ estado, progreso }: { estado: "llena" | "actual" | "vacia"; progreso: MotionValue<number> }) {
  const ancho = useTransform(progreso, (v) => `${v * 100}%`);
  return (
    <div className="h-1 flex-1 overflow-hidden rounded-full bg-current/25">
      {estado === "llena" && <div className="h-full w-full rounded-full bg-current" />}
      {estado === "actual" && <motion.div className="h-full rounded-full bg-current" style={{ width: ancho }} />}
    </div>
  );
}

/** Los elementos de cada pantalla entran uno detrás de otro. */
const contenedor = { oculto: {}, visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } } };
const entra = {
  oculto: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 24 } },
};
const golpe = {
  oculto: { opacity: 0, scale: 0.4, rotate: -8 },
  visible: { opacity: 1, scale: 1, rotate: -3, transition: { type: "spring" as const, stiffness: 300, damping: 14 } },
};

function Contenido({ diapositiva: d }: { diapositiva: Diapositiva }) {
  return (
    <motion.div variants={contenedor} initial="oculto" animate="visible" className="relative flex flex-col">
      {d.tipo === "intro" && (
        <>
          <motion.p variants={entra} className="text-sm font-bold tracking-[0.2em] text-amarillo">
            TU AÑO EN LA LIGA
          </motion.p>
          <motion.h1 variants={entra} className="titulo-sticker mt-3 font-display text-7xl leading-[0.88] tracking-wide break-words">
            {d.grupo}
          </motion.h1>
          <motion.p variants={entra} className="mt-5 font-heading text-2xl font-semibold">
            Temporada {d.anio}
          </motion.p>
        </>
      )}

      {d.tipo === "numero" && (
        <>
          <span aria-hidden className="trama-oscura pointer-events-none fixed inset-0" />
          <motion.p variants={entra} className="relative font-heading text-2xl font-bold">
            {d.antes}
          </motion.p>
          <motion.p variants={golpe} className="relative origin-left font-display text-[12rem] leading-[0.9] [text-shadow:6px_6px_0_var(--amarillo)]">
            {d.numero}
          </motion.p>
          <motion.p variants={entra} className="relative font-heading text-2xl font-bold">
            {d.despues}
          </motion.p>
          <motion.div
            variants={entra}
            role="img"
            aria-label={`Juntadas por mes: ${d.meses.map((n, i) => `${INICIALES_DE_MES[i]} ${n}`).join(", ")}`}
            className="relative mt-10 grid h-24 grid-cols-12 items-end gap-1.5"
          >
            {d.meses.map((cantidad, i) => {
              const maximo = Math.max(1, ...d.meses);
              return (
                <div key={i} className="flex h-full flex-col items-center justify-end gap-1.5">
                  <motion.div
                    className={`w-full max-w-5 origin-bottom rounded-t-[4px] ${i >= d.mesesTranscurridos ? "bg-violeta-oscuro/25" : cantidad === maximo ? "bg-amarillo" : "bg-violeta-oscuro"}`}
                    style={{ height: `${Math.max(cantidad === 0 ? 0 : 6, (cantidad / maximo) * 72)}px` }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: 0.5 + i * 0.05, type: "spring", stiffness: 200, damping: 20 }}
                  />
                  <span className="text-[11px] font-bold">{INICIALES_DE_MES[i]}</span>
                </div>
              );
            })}
          </motion.div>
        </>
      )}

      {(d.tipo === "persona" || d.tipo === "final") && (
        <div className="flex flex-col items-center text-center">
          {d.tipo === "final" && <Confeti cantidad={30} fijo />}
          {d.tipo === "final" && (
            <motion.span variants={golpe}>
              <Crown aria-hidden className="size-20 fill-amarillo text-violeta-oscuro" strokeWidth={1.6} />
            </motion.span>
          )}
          <motion.p variants={entra} className={`text-sm font-bold tracking-[0.2em] uppercase ${d.tipo === "persona" && d.negativo ? "text-naranja" : ""}`}>
            {d.etiqueta}
          </motion.p>
          <motion.div variants={golpe} className="mt-6 flex -space-x-6">
            {d.personas.slice(0, 3).map((p) => (
              <span key={p.nombre} className="rounded-full border-[5px] border-violeta-oscuro shadow-[6px_6px_0_var(--violeta-oscuro)]">
                <Avatar nombre={p.nombre} fotoUrl={p.fotoUrl} tamano="enorme" />
              </span>
            ))}
          </motion.div>
          <motion.p
            variants={entra}
            className={`mt-6 font-display leading-[0.9] tracking-wide break-words ${d.personas.length > 1 ? "text-5xl" : "text-7xl"} ${d.tipo === "persona" && d.negativo ? "[text-shadow:4px_4px_0_var(--naranja)]" : ""}`}
          >
            {d.personas.map((p) => p.nombre).join(" y ")}
          </motion.p>
          <motion.p
            variants={entra}
            className={`mt-3 font-heading text-2xl font-extrabold ${d.tipo === "persona" && d.negativo ? "text-naranja" : ""}`}
          >
            {d.detalle}
            {d.personas.length > 1 && <span className="block text-base font-semibold opacity-80">Empate</span>}
          </motion.p>
          {d.tipo === "final" && (
            <motion.div variants={entra} className="mt-8">
              <BotonCompartir texto={d.textoParaCompartir} />
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}

/** Compartir por WhatsApp u otras apps (o copiar el texto si el navegador no puede). */
function BotonCompartir({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);

  async function compartir() {
    const datos = { title: "Liga de Amigos", text: texto, url: window.location.origin };
    try {
      if (navigator.share) {
        await navigator.share(datos);
      } else {
        await navigator.clipboard.writeText(`${texto} ${datos.url}`);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      }
    } catch {
      // La persona cerró el menú de compartir: no pasa nada.
    }
  }

  return (
    <button
      type="button"
      onClick={compartir}
      className="presionable inline-flex h-12 items-center gap-2 rounded-full bg-violeta-oscuro px-6 font-bold text-amarillo"
    >
      <Share2 aria-hidden className="size-5" />
      {copiado ? "¡Copiado!" : "Compartir"}
    </button>
  );
}
