/**
 * Formato de fechas "AAAA-MM-DD" para mostrar. Se interpretan en UTC a
 * propósito: son días, no momentos, y así no se corren por la zona horaria.
 */
const formatoCorto = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const formatoLargo = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const aFecha = (texto: string) => new Date(`${texto}T00:00:00Z`);

/** "sáb, 14 nov" */
export function fechaCorta(texto: string): string {
  return formatoCorto.format(aFecha(texto));
}

/** "sábado, 14 de noviembre de 2026" */
export function fechaLarga(texto: string): string {
  return formatoLargo.format(aFecha(texto));
}

/** "+3", "0", "-2" */
export function conSigno(puntos: number): string {
  return puntos > 0 ? `+${puntos}` : String(puntos);
}
