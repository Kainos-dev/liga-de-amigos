import "server-only";
import type { TransactionSql } from "postgres";
import { sql } from "@/server/db";
import { ErrorDeDominio } from "@/server/domain/errores";
import { hoy } from "@/server/domain/fechas";
import { validarFechaDeCarga } from "@/server/domain/juntadas";
import { anioDeTemporada, inicioYFin } from "@/server/domain/temporadas";

/**
 * Temporada en la que cae una fecha, verificando que admita cargas.
 * Si todavía no existe (por ejemplo, la primera juntada de enero), la crea.
 */
export async function temporadaParaCargar(
  tx: TransactionSql,
  grupoId: string,
  fecha: string,
): Promise<string> {
  const anio = anioDeTemporada(fecha);
  const { inicio, fin } = inicioYFin(anio);

  // ON CONFLICT DO NOTHING: si ya existe, no hace nada y la buscamos abajo.
  await tx`
    INSERT INTO temporadas (grupo_id, anio, inicio, fin)
    VALUES (${grupoId}, ${anio}, ${inicio}, ${fin})
    ON CONFLICT (grupo_id, anio) DO NOTHING
  `;
  const [temporada] = await tx<{ id: string; cerrada: boolean }[]>`
    SELECT id, cerrada_en IS NOT NULL AS cerrada
    FROM temporadas WHERE grupo_id = ${grupoId} AND anio = ${anio}
  `;

  validarFechaDeCarga(fecha, hoy(), temporada.cerrada);
  return temporada.id;
}

export type TemporadaElegida = { id: string; anio: number; cerrada: boolean };

/**
 * Temporada a mostrar: la del año pedido, o la del año actual. Si todavía no
 * existe la de este año (ej. 1 de enero sin cargas), la última que haya.
 * Devuelve también la lista de años, del más nuevo al más viejo.
 */
export async function elegirTemporada(
  grupoId: string,
  anioPedido?: number,
): Promise<{ temporada: TemporadaElegida; anios: number[] }> {
  const temporadas = await sql<TemporadaElegida[]>`
    SELECT id, anio, cerrada_en IS NOT NULL AS cerrada
    FROM temporadas WHERE grupo_id = ${grupoId}
    ORDER BY anio DESC
  `;
  const anio = anioPedido ?? anioDeTemporada(hoy());
  const temporada =
    temporadas.find((t) => t.anio === anio) ?? (anioPedido ? undefined : temporadas[0]);
  if (!temporada) {
    throw new ErrorDeDominio(`No hay temporada ${anio} en este grupo`);
  }
  return { temporada, anios: temporadas.map((t) => t.anio) };
}

/** Para editar o borrar algo ya cargado: su temporada tiene que seguir abierta. */
export async function validarTemporadaEditable(
  tx: TransactionSql,
  temporadaId: string,
  fecha: string,
): Promise<void> {
  const [temporada] = await tx<{ cerrada: boolean }[]>`
    SELECT cerrada_en IS NOT NULL AS cerrada FROM temporadas WHERE id = ${temporadaId}
  `;
  validarFechaDeCarga(fecha, hoy(), temporada.cerrada);
}
