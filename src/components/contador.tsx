"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect } from "react";

/**
 * Un número que "sube" desde 0 hasta su valor al aparecer (como un marcador).
 * Con "reducir movimiento" activado, muestra el valor directamente.
 * No usa estado de React: Motion actualiza el texto por su cuenta, sin re-renders.
 */
export function Contador({ valor, demora = 0 }: { valor: number; demora?: number }) {
  const quieto = useReducedMotion();
  const actual = useMotionValue(quieto ? valor : 0);
  const redondeado = useTransform(actual, (v) => Math.round(v));

  useEffect(() => {
    if (quieto) {
      actual.set(valor);
      return;
    }
    const animacion = animate(actual, valor, {
      duration: 1.1,
      delay: demora,
      ease: [0.2, 0.8, 0.2, 1],
    });
    return () => animacion.stop();
  }, [actual, valor, demora, quieto]);

  return <motion.span>{redondeado}</motion.span>;
}
