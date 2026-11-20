import "server-only";
import type { TransactionSql } from "postgres";
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
