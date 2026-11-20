/**
 * Resúmenes mensual y anual de una temporada. Funciones puras: reciben los
 * datos ya cargados y devuelven qué mostrar.
 *
 * Regla de oro (documento funcional): no inventar ganadores. Si no hay datos
 * suficientes, el destacado es null y la pantalla no lo muestra. Los empates
 * se muestran como empates (varios integrantes en un mismo destacado).
 */
import type { ClaveSistema } from "./acciones";
import type { EstadoDeParticipacion } from "./puntos";
import { armarTabla, cambiosDePosicion, porcentajeDeAsistencia, type RegistroParaTabla } from "./tabla";

export type DatosDeTemporada = {
  integrantes: { id: string; nombre: string }[];
  /** Solo juntadas no canceladas. */
  juntadas: { id: string; fecha: string; titulo: string | null }[];
  participaciones: { juntadaId: string; integranteId: string; estado: EstadoDeParticipacion }[];
  registros: (RegistroParaTabla & { fecha: string })[];
  acciones: { id: string; nombre: string; clave: ClaveSistema | null }[];
};

/** Uno o más integrantes (si empatan) con el valor que los destaca. */
export type Destacado = { integranteIds: string[]; valor: number };

export type DestacadoPorAccion = { accionId: string; nombre: string } & Destacado;

/** Mínimo de juntadas (fue + faltó) para competir por "el más constante". */
export const MINIMO_PARA_CONSTANCIA = 3;

const NOMBRES_DE_MES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function nombreDeMes(mes: string): string {
  return `${NOMBRES_DE_MES[Number(mes.slice(5, 7)) - 1]} ${mes.slice(0, 4)}`;
}

/** "2026-11" → "2026-12-01" (primer día del mes siguiente, para comparar fechas). */
export function primerDiaDelMesSiguiente(mes: string): string {
  const [anio, numero] = mes.split("-").map(Number);
  return numero === 12 ? `${anio + 1}-01-01` : `${anio}-${String(numero + 1).padStart(2, "0")}-01`;
}

/**
 * Quién tiene el valor más alto (o más bajo, con "menor"). Solo cuentan los
 * valores distintos de cero en ese sentido: si nadie sumó, no hay destacado.
 */
export function lideres(valores: Map<string, number>, sentido: "mayor" | "menor" = "mayor"): Destacado | null {
  let mejor: number | null = null;
  for (const valor of valores.values()) {
    const cuenta = sentido === "mayor" ? valor > 0 : valor < 0;
    if (!cuenta) continue;
    if (mejor === null || (sentido === "mayor" ? valor > mejor : valor < mejor)) mejor = valor;
  }
  if (mejor === null) return null;
  const integranteIds = [...valores.entries()].filter(([, v]) => v === mejor).map(([id]) => id);
  return { integranteIds, valor: mejor };
}

function sumarPor<T>(filas: T[], clave: (fila: T) => string, valor: (fila: T) => number) {
  const totales = new Map<string, number>();
  for (const fila of filas) totales.set(clave(fila), (totales.get(clave(fila)) ?? 0) + valor(fila));
  return totales;
}

/** Para cada acción común con puntos a favor, quién la hizo más veces. */
function destacadosPorAccion(datos: DatosDeTemporada, registros: DatosDeTemporada["registros"]) {
  const resultado: DestacadoPorAccion[] = [];
  for (const accion of datos.acciones) {
    if (accion.clave) continue; // asistir/faltar tienen su propio destacado
    const suyos = registros.filter((r) => r.accionId === accion.id && r.puntos > 0);
    const destacado = lideres(sumarPor(suyos, (r) => r.integranteId, () => 1));
    if (destacado) resultado.push({ accionId: accion.id, nombre: accion.nombre, ...destacado });
  }
  return resultado;
}

/** Puestos que subió/bajó cada uno entre dos momentos (null si antes no había puntos). */
function movimientos(datos: DatosDeTemporada, antesDe: string, hasta: string) {
  const anteriores = datos.registros.filter((r) => r.fecha < antesDe);
  const posteriores = datos.registros.filter((r) => r.fecha < hasta);
  if (anteriores.length === 0 || posteriores.length === anteriores.length) return null;
  const cambios = cambiosDePosicion(
    armarTabla(datos.integrantes, posteriores),
    armarTabla(datos.integrantes, anteriores),
    true,
  );
  if (!cambios) return null;
  const mapa = new Map(Object.entries(cambios));
  return { subida: lideres(mapa, "mayor"), bajada: lideres(mapa, "menor") };
}

function asistentesPorJuntada(participaciones: DatosDeTemporada["participaciones"]) {
  return sumarPor(
    participaciones.filter((p) => p.estado === "asistio"),
    (p) => p.juntadaId,
    () => 1,
  );
}

function promedio(valores: number[]): number | null {
  if (valores.length === 0) return null;
  return Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 10) / 10;
}

// ─── Mensual ────────────────────────────────────────────────────────────────

export type ResumenMensual = {
  mes: string; // AAAA-MM
  hayActividad: boolean;
  juntadas: number;
  promedioDeAsistentes: number | null;
  figura: Destacado | null; // más puntos en el mes
  masAsistencia: Destacado | null;
  desastre: Destacado | null; // más puntos perdidos por acciones negativas
  porAccion: DestacadoPorAccion[];
  mayorSubida: Destacado | null;
  mayorBajada: Destacado | null;
  /** Solo si hubo al menos dos juntadas (con una sola no es un récord). */
  juntadaMasConcurrida: { juntadaId: string; titulo: string | null; fecha: string; asistentes: number } | null;
};

export function resumenMensual(datos: DatosDeTemporada, mes: string): ResumenMensual {
  const delMes = (fecha: string) => fecha.slice(0, 7) === mes;
  const juntadas = datos.juntadas.filter((j) => delMes(j.fecha));
  const idsDeJuntadas = new Set(juntadas.map((j) => j.id));
  const participaciones = datos.participaciones.filter((p) => idsDeJuntadas.has(p.juntadaId));
  const registros = datos.registros.filter((r) => delMes(r.fecha));

  const asistentes = asistentesPorJuntada(participaciones);
  let juntadaMasConcurrida: ResumenMensual["juntadaMasConcurrida"] = null;
  if (juntadas.length >= 2) {
    const [primera] = [...juntadas].sort(
      (a, b) => (asistentes.get(b.id) ?? 0) - (asistentes.get(a.id) ?? 0) || a.fecha.localeCompare(b.fecha),
    );
    juntadaMasConcurrida = {
      juntadaId: primera.id,
      titulo: primera.titulo,
      fecha: primera.fecha,
      asistentes: asistentes.get(primera.id) ?? 0,
    };
  }

  const mov = movimientos(datos, `${mes}-01`, primerDiaDelMesSiguiente(mes));

  return {
    mes,
    hayActividad: juntadas.length > 0 || registros.length > 0,
    juntadas: juntadas.length,
    promedioDeAsistentes: promedio(juntadas.map((j) => asistentes.get(j.id) ?? 0)),
    figura: lideres(sumarPor(registros, (r) => r.integranteId, (r) => r.puntos)),
    masAsistencia: lideres(asistenciasPorIntegrante(participaciones)),
    desastre: lideres(
      sumarPor(registros.filter((r) => r.puntos < 0), (r) => r.integranteId, (r) => r.puntos),
      "menor",
    ),
    porAccion: destacadosPorAccion(datos, registros),
    mayorSubida: mov?.subida ?? null,
    mayorBajada: mov?.bajada ?? null,
    juntadaMasConcurrida,
  };
}

function asistenciasPorIntegrante(participaciones: DatosDeTemporada["participaciones"]) {
  return sumarPor(
    participaciones.filter((p) => p.estado === "asistio"),
    (p) => p.integranteId,
    () => 1,
  );
}

// ─── Anual ──────────────────────────────────────────────────────────────────

export type ResumenAnual = {
  anio: number;
  hayActividad: boolean;
  juntadas: number;
  juntadasPorMes: number[]; // 12 valores, enero a diciembre
  mesesTranscurridos: number; // para no tratar como "flojos" los meses que no pasaron
  mesMasActivo: { meses: number[]; juntadas: number } | null; // meses 1..12
  mesMenosActivo: { meses: number[]; juntadas: number } | null;
  promedioDeAsistentes: number | null;
  campeon: Destacado | null; // primero de la tabla (con puntos a favor)
  masConstante: Destacado | null; // mejor % de asistencia (con un mínimo de juntadas)
  masAsistencia: Destacado | null;
  desastre: Destacado | null;
  porAccion: DestacadoPorAccion[];
  /** Posición al cierre del primer mes con puntos, para comparar con la final. */
  posicionInicial: Record<string, number> | null;
  mayorAscenso: Destacado | null;
  mayorDescenso: Destacado | null;
};

export function resumenAnual(datos: DatosDeTemporada, anio: number, hoy: string): ResumenAnual {
  const juntadasPorMes = Array.from({ length: 12 }, () => 0);
  for (const juntada of datos.juntadas) juntadasPorMes[Number(juntada.fecha.slice(5, 7)) - 1] += 1;

  const anioDeHoy = Number(hoy.slice(0, 4));
  const mesesTranscurridos = anio < anioDeHoy ? 12 : anio > anioDeHoy ? 0 : Number(hoy.slice(5, 7));
  const transcurridos = juntadasPorMes.slice(0, mesesTranscurridos);

  const extremo = (sentido: "max" | "min") => {
    if (datos.juntadas.length === 0 || transcurridos.length === 0) return null;
    const valor = sentido === "max" ? Math.max(...transcurridos) : Math.min(...transcurridos);
    const meses = transcurridos.flatMap((v, i) => (v === valor ? [i + 1] : []));
    return { meses, juntadas: valor };
  };
  const mesMasActivo = extremo("max");
  let mesMenosActivo = extremo("min");
  // Si todos los meses tuvieron lo mismo, no hay "mes flojo".
  if (mesMenosActivo && mesMasActivo && mesMenosActivo.juntadas === mesMasActivo.juntadas) {
    mesMenosActivo = null;
  }

  const tablaFinal = armarTabla(datos.integrantes, datos.registros);
  const primeros = tablaFinal.filter((f) => f.posicion === 1 && f.puntos > 0);
  const campeon = primeros.length > 0
    ? { integranteIds: primeros.map((f) => f.integranteId), valor: primeros[0].puntos }
    : null;

  // Constancia: % de asistencia de quienes tuvieron al menos N juntadas con dato.
  const porcentajes = new Map<string, number>();
  for (const integrante of datos.integrantes) {
    const suyas = datos.participaciones.filter((p) => p.integranteId === integrante.id);
    const fue = suyas.filter((p) => p.estado === "asistio").length;
    const falto = suyas.filter((p) => p.estado === "ausente_confirmado").length;
    if (fue + falto >= MINIMO_PARA_CONSTANCIA) {
      porcentajes.set(integrante.id, porcentajeDeAsistencia(fue, falto) ?? 0);
    }
  }

  // Posición inicial: al cierre del primer mes con puntos.
  const meses = [...new Set(datos.registros.map((r) => r.fecha.slice(0, 7)))].sort();
  let posicionInicial: ResumenAnual["posicionInicial"] = null;
  let mov: ReturnType<typeof movimientos> = null;
  if (meses.length >= 2) {
    const corte = primerDiaDelMesSiguiente(meses[0]);
    posicionInicial = Object.fromEntries(
      armarTabla(datos.integrantes, datos.registros.filter((r) => r.fecha < corte)).map((f) => [
        f.integranteId,
        f.posicion,
      ]),
    );
    mov = movimientos(datos, corte, "9999-12-31");
  }

  const asistentes = asistentesPorJuntada(datos.participaciones);

  return {
    anio,
    hayActividad: datos.juntadas.length > 0 || datos.registros.length > 0,
    juntadas: datos.juntadas.length,
    juntadasPorMes,
    mesesTranscurridos,
    mesMasActivo,
    mesMenosActivo,
    promedioDeAsistentes: promedio(datos.juntadas.map((j) => asistentes.get(j.id) ?? 0)),
    campeon,
    masConstante: lideres(porcentajes),
    masAsistencia: lideres(asistenciasPorIntegrante(datos.participaciones)),
    desastre: lideres(
      sumarPor(datos.registros.filter((r) => r.puntos < 0), (r) => r.integranteId, (r) => r.puntos),
      "menor",
    ),
    porAccion: destacadosPorAccion(datos, datos.registros),
    posicionInicial,
    mayorAscenso: mov?.subida ?? null,
    mayorDescenso: mov?.bajada ?? null,
  };
}
