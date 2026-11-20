/**
 * Validaciones para configurar las acciones de un grupo (solo administradores).
 * Separado de acciones.ts porque ese archivo también se usa en el navegador
 * y así no arrastra Zod al código que se descarga en el celular.
 */
import { z } from "zod";
import type { ClaveSistema } from "./acciones";
import { ErrorDeDominio } from "./errores";

export const PUNTOS_MINIMOS = -50;
export const PUNTOS_MAXIMOS = 50;

const nombreDeAccion = z
  .string()
  .trim()
  .min(1, { error: "Poné un nombre para la acción" })
  .max(40, { error: "El nombre puede tener hasta 40 caracteres" });

const puntosDeAccion = z
  .number({ error: "Los puntos tienen que ser un número" })
  .int({ error: "Los puntos tienen que ser un número entero" })
  .min(PUNTOS_MINIMOS, { error: `Los puntos van de ${PUNTOS_MINIMOS} a +${PUNTOS_MAXIMOS}` })
  .max(PUNTOS_MAXIMOS, { error: `Los puntos van de ${PUNTOS_MINIMOS} a +${PUNTOS_MAXIMOS}` });

export const esquemaCrearAccion = z.object({
  nombre: nombreDeAccion,
  puntos: puntosDeAccion,
});

export const esquemaEditarAccion = z
  .object({
    nombre: nombreDeAccion.optional(),
    puntos: puntosDeAccion.optional(),
    archivada: z.boolean().optional(),
  })
  .refine((cambios) => Object.values(cambios).some((valor) => valor !== undefined), {
    error: "No hay nada para cambiar",
  });

export type CambiosDeAccion = z.infer<typeof esquemaEditarAccion>;

/** Asistir y Faltar las aplica el sistema: se les cambian los puntos, pero no se archivan. */
export function validarArchivado(clave: ClaveSistema | null): void {
  if (clave) {
    throw new ErrorDeDominio(
      "Esta acción la aplica el sistema según la asistencia: no se puede archivar. Si no querés que sume ni reste, ponele 0 puntos",
    );
  }
}
