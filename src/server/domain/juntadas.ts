/**
 * Reglas de juntadas y acciones sueltas: validación de lo que llega,
 * quién puede editar y qué fechas se pueden cargar.
 */
import { z } from "zod";
import { ErrorDeDominio } from "./errores";
import type { Rol } from "./grupos";
import { admiteCargas, anioDeTemporada } from "./temporadas";

/** Pasadas estas horas desde que se cargó, solo un administrador la edita. */
export const HORAS_PARA_EDITAR = 48;

const fecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "La fecha tiene que ser AAAA-MM-DD" })
  .refine((texto) => {
    // Descarta fechas imposibles como 2026-02-31.
    const d = new Date(`${texto}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texto;
  }, { error: "La fecha no existe" });

/** Texto opcional: vacío o solo espacios se guarda como null. */
const textoOpcional = (maximo: number, campo: string) =>
  z
    .string()
    .trim()
    .max(maximo, { error: `${campo} puede tener hasta ${maximo} caracteres` })
    .nullish()
    .transform((valor) => valor || null);

const estado = z.enum(["asistio", "ausente_confirmado", "no_invitado", "sin_dato"], {
  error: "Estado de asistencia inválido",
});

export const esquemaJuntada = z
  .object({
    fecha,
    titulo: textoOpcional(60, "El título"),
    notas: textoOpcional(500, "Las notas"),
    invitadosExternos: textoOpcional(200, "Los invitados"),
    participaciones: z.array(
      z.object({ integranteId: z.uuid({ error: "Integrante inválido" }), estado }),
    ),
    acciones: z.array(
      z.object({
        integranteId: z.uuid({ error: "Integrante inválido" }),
        accionId: z.uuid({ error: "Acción inválida" }),
      }),
    ),
  })
  .refine((juntada) => juntada.participaciones.some((p) => p.estado === "asistio"), {
    error: "Marcá al menos a una persona que fue",
  });

export type DatosJuntada = z.infer<typeof esquemaJuntada>;

export const esquemaCancelarJuntada = z.object({ cancelada: z.boolean() });

export const esquemaAccionSuelta = z.object({
  fecha,
  integranteId: z.uuid({ error: "Elegí a quién" }),
  accionId: z.uuid({ error: "Elegí una acción" }),
  nota: textoOpcional(200, "La nota"),
});

export type DatosAccionSuelta = z.infer<typeof esquemaAccionSuelta>;

/**
 * ¿Puede editar (o borrar) algo cargado? Cualquier integrante dentro de las
 * primeras 48 h; después, solo los administradores.
 */
export function puedeEditar(rol: Rol, creadoEn: Date, ahora: Date): boolean {
  if (rol === "admin") return true;
  const horas = (ahora.getTime() - creadoEn.getTime()) / 3_600_000;
  return horas <= HORAS_PARA_EDITAR;
}

/**
 * Valida que se pueda cargar algo con esa fecha: no futura y con la
 * temporada abierta (o dentro del período de gracia).
 */
export function validarFechaDeCarga(
  fechaDelEvento: string,
  hoy: string,
  temporadaCerrada: boolean,
): void {
  if (fechaDelEvento > hoy) {
    throw new ErrorDeDominio("La fecha no puede ser futura");
  }
  if (!admiteCargas(anioDeTemporada(fechaDelEvento), hoy, temporadaCerrada)) {
    throw new ErrorDeDominio(
      `La temporada ${anioDeTemporada(fechaDelEvento)} está cerrada: ya no se pueden cargar cosas en ella`,
    );
  }
}

/** Saca las filas "sin dato": no se guardan (sin fila = sin dato). */
export function participacionesAGuardar<T extends { estado: string }>(participaciones: T[]): T[] {
  return participaciones.filter((p) => p.estado !== "sin_dato");
}
