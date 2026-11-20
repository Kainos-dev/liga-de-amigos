/**
 * "Hoy" según la hora de Argentina, como "AAAA-MM-DD".
 *
 * El servidor (Vercel, Neon) corre en UTC: a las 22 h de Buenos Aires ya es
 * "mañana" en UTC. Para fechas que ve la gente (ingreso a un grupo, temporada
 * actual) usamos la hora local.
 */
export const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

export function hoy(ahora: Date = new Date()): string {
  // El formato "en-CA" da justo AAAA-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA }).format(ahora);
}
