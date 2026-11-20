/**
 * Arma las pantallas del "Wrapped" a partir del resumen anual. Solo incluye
 * una pantalla si hay datos que la respalden (no se inventan ganadores):
 * un año flojo puede tener tres pantallas y uno movido, nueve.
 */
import type { Destacado } from "@/server/domain/resumenes";
import type { Personas, VistaAnual } from "@/server/services/resumenes";

export type Fondo = "violeta" | "naranja" | "amarillo" | "oscuro";
export type Persona = { nombre: string; fotoUrl: string | null };

export type Diapositiva =
  | { tipo: "intro"; fondo: Fondo; grupo: string; anio: number }
  | { tipo: "numero"; fondo: Fondo; antes: string; numero: number; despues: string; meses: number[]; mesesTranscurridos: number }
  | { tipo: "persona"; fondo: Fondo; etiqueta: string; personas: Persona[]; detalle: string; negativo?: boolean }
  | { tipo: "final"; fondo: Fondo; etiqueta: string; personas: Persona[]; detalle: string; textoParaCompartir: string };

function nombres(ids: string[], personas: Personas): string {
  const lista = ids.map((id) => personas[id]?.nombre ?? "Alguien");
  return lista.length <= 1 ? lista.join("") : `${lista.slice(0, -1).join(", ")} y ${lista.at(-1)}`;
}

function aPersonas(destacado: Destacado, personas: Personas): Persona[] {
  return destacado.integranteIds.map((id) => ({
    nombre: personas[id]?.nombre ?? "Alguien",
    fotoUrl: personas[id]?.fotoUrl ?? null,
  }));
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export function armarDiapositivas(vista: VistaAnual, grupo: string): Diapositiva[] {
  const { resumen, personas } = vista;
  const lista: Diapositiva[] = [{ tipo: "intro", fondo: "violeta", grupo, anio: resumen.anio }];

  if (resumen.juntadas > 0) {
    lista.push({
      tipo: "numero",
      fondo: "naranja",
      antes: "Este año se juntaron",
      numero: resumen.juntadas,
      despues: resumen.juntadas === 1 ? "vez." : "veces.",
      meses: resumen.juntadasPorMes,
      mesesTranscurridos: resumen.mesesTranscurridos,
    });
  }

  if (resumen.masAsistencia) {
    lista.push({
      tipo: "persona",
      fondo: "amarillo",
      etiqueta: "El más presente",
      personas: aPersonas(resumen.masAsistencia, personas),
      detalle: `Fue a ${plural(resumen.masAsistencia.valor, "juntada", "juntadas")}`,
    });
  }

  // La constancia solo si destaca a alguien distinto (si no, repite la pantalla anterior).
  const mismoQueAsistencia =
    resumen.masConstante &&
    resumen.masAsistencia &&
    resumen.masConstante.integranteIds.join() === resumen.masAsistencia.integranteIds.join();
  if (resumen.masConstante && !mismoQueAsistencia) {
    lista.push({
      tipo: "persona",
      fondo: "violeta",
      etiqueta: "El más constante",
      personas: aPersonas(resumen.masConstante, personas),
      detalle: `${resumen.masConstante.valor}% de asistencia`,
    });
  }

  // Hasta dos acciones destacadas (las primeras de la lista del grupo).
  for (const accion of resumen.porAccion.slice(0, 2)) {
    lista.push({
      tipo: "persona",
      fondo: "naranja",
      etiqueta: `Más veces: ${accion.nombre}`,
      personas: aPersonas(accion, personas),
      detalle: plural(accion.valor, "vez", "veces"),
    });
  }

  if (resumen.mayorAscenso) {
    lista.push({
      tipo: "persona",
      fondo: "violeta",
      etiqueta: "La gran remontada",
      personas: aPersonas(resumen.mayorAscenso, personas),
      detalle: `Subió ${plural(resumen.mayorAscenso.valor, "puesto", "puestos")} desde el arranque`,
    });
  }

  if (resumen.desastre) {
    lista.push({
      tipo: "persona",
      fondo: "oscuro",
      etiqueta: "El desastre del año",
      personas: aPersonas(resumen.desastre, personas),
      detalle: `${resumen.desastre.valor} puntos perdidos`,
      negativo: true,
    });
  }

  if (resumen.campeon) {
    const quien = nombres(resumen.campeon.integranteIds, personas);
    const etiqueta = vista.cerrada ? "Amigo del año" : "Va primero";
    lista.push({
      tipo: "final",
      fondo: "amarillo",
      etiqueta,
      personas: aPersonas(resumen.campeon, personas),
      detalle: `${resumen.campeon.valor} puntos`,
      textoParaCompartir: vista.cerrada
        ? `${quien} es ${resumen.campeon.integranteIds.length > 1 ? "amigos" : "amigo"} del año ${resumen.anio} en ${grupo}, con ${resumen.campeon.valor} puntos.`
        : `En ${grupo} va primero ${quien}, con ${resumen.campeon.valor} puntos. ¿Quién lo alcanza?`,
    });
  }

  return lista;
}
