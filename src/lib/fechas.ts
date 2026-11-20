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

const formatoMes = new Intl.DateTimeFormat("es-AR", { month: "short", timeZone: "UTC" });

/** "2026-11-14" → { dia: "14", mes: "NOV" } (para el bloque de fecha de las juntadas). */
export function diaYMes(texto: string): { dia: string; mes: string } {
  return {
    dia: texto.slice(8, 10),
    mes: formatoMes.format(aFecha(texto)).replace(".", "").toUpperCase(),
  };
}

/** "2026-11-01" → "1/11" */
export function diaBarraMes(texto: string): string {
  return `${Number(texto.slice(8, 10))}/${Number(texto.slice(5, 7))}`;
}
