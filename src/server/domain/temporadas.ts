/**
 * Temporadas: por defecto, el año calendario.
 * Después del 31/12 hay un período de gracia para cargar lo atrasado;
 * pasado ese plazo la temporada se puede cerrar.
 */

export const DIAS_DE_GRACIA = 15;

/** Año de temporada al que pertenece una fecha "AAAA-MM-DD". */
export function anioDeTemporada(fecha: string): number {
  return Number(fecha.slice(0, 4));
}

export function inicioYFin(anio: number): { inicio: string; fin: string } {
  return { inicio: `${anio}-01-01`, fin: `${anio}-12-31` };
}

/** Último día en que se puede cargar algo en la temporada de ese año. */
export function finDelPeriodoDeGracia(anio: number, diasDeGracia = DIAS_DE_GRACIA): string {
  // Día N de enero del año siguiente. Date.UTC acomoda solo si N pasa de 31.
  const fecha = new Date(Date.UTC(anio + 1, 0, diasDeGracia));
  return fecha.toISOString().slice(0, 10);
}

/** ¿Todavía se pueden cargar cosas en la temporada de ese año? */
export function admiteCargas(
  anio: number,
  hoy: string,
  cerrada: boolean,
  diasDeGracia = DIAS_DE_GRACIA,
): boolean {
  if (cerrada) return false;
  return hoy <= finDelPeriodoDeGracia(anio, diasDeGracia);
}
