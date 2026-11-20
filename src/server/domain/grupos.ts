/**
 * Reglas de grupos: código para unirse, validaciones y permisos de rol.
 */
import { randomInt } from "node:crypto";
import { z } from "zod";
import { ErrorDeDominio } from "./errores";

export type Rol = "admin" | "miembro";

// Sin 0/O, 1/I/L ni 5/S: se confunden al dictarlo o copiarlo de una captura.
const ALFABETO_DE_CODIGO = "ABCDEFGHJKMNPQRTUVWXYZ2346789";
export const LARGO_DE_CODIGO = 6;

/** Código nuevo al azar, por ejemplo "K7M2QX". */
export function generarCodigo(): string {
  let codigo = "";
  for (let i = 0; i < LARGO_DE_CODIGO; i++) {
    codigo += ALFABETO_DE_CODIGO[randomInt(ALFABETO_DE_CODIGO.length)];
  }
  return codigo;
}

/** Acepta lo que escribe la gente: "k7m 2qx", "K7M-2QX"... → "K7M2QX". */
export function normalizarCodigo(texto: string): string {
  return texto.toUpperCase().replace(/[\s-]/g, "");
}

const nombreDeGrupo = z
  .string()
  .trim()
  .min(1, { error: "Poné un nombre para el grupo" })
  .max(40, { error: "El nombre puede tener hasta 40 caracteres" });

const nombreDeIntegrante = z
  .string()
  .trim()
  .min(1, { error: "Poné un nombre" })
  .max(30, { error: "El nombre puede tener hasta 30 caracteres" });

export const esquemaCrearGrupo = z.object({ nombre: nombreDeGrupo });
export const esquemaRenombrarGrupo = z.object({ nombre: nombreDeGrupo });

export const esquemaSolicitarIngreso = z.object({
  codigo: z
    .string()
    .transform(normalizarCodigo)
    .pipe(z.string().length(LARGO_DE_CODIGO, { error: "El código tiene 6 caracteres" })),
});

export const esquemaAceptarSolicitud = z.object({
  /** Perfil sin cuenta al que se vincula la persona (opcional). */
  integranteId: z.uuid({ error: "Integrante inválido" }).optional(),
});

export const esquemaAgregarIntegrante = z.object({ nombre: nombreDeIntegrante });

export const esquemaCambiarRol = z.object({
  rol: z.enum(["admin", "miembro"], { error: "Rol inválido" }),
});

/**
 * Un grupo nunca puede quedarse sin administradores: no se puede quitar el
 * rol ni sacar del grupo al último que queda.
 */
export function validarQueQuedeUnAdmin(
  cambio: { rolActual: Rol; rolNuevo: Rol | null }, // null = sale del grupo
  cantidadDeAdmins: number,
): void {
  const dejaDeSerAdmin = cambio.rolActual === "admin" && cambio.rolNuevo !== "admin";
  if (dejaDeSerAdmin && cantidadDeAdmins <= 1) {
    throw new ErrorDeDominio(
      "El grupo necesita al menos un administrador. Nombrá a otro antes de hacer este cambio",
    );
  }
}
