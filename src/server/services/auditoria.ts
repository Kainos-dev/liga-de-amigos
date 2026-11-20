import "server-only";
import type { TransactionSql } from "postgres";

/**
 * Anota un cambio en audit_log (quién hizo qué y cuándo).
 * Se llama dentro de la misma transacción que el cambio: si el cambio falla,
 * tampoco queda anotado.
 */
export async function registrarAuditoria(
  tx: TransactionSql,
  entrada: {
    grupoId: string;
    usuarioId: string;
    accion: string; // ej. "solicitud.aceptar"
    entidad: string; // ej. "integrante"
    entidadId?: string;
    datos?: Record<string, string | number | boolean | null>;
  },
): Promise<void> {
  await tx`
    INSERT INTO audit_log (grupo_id, usuario_id, accion, entidad, entidad_id, datos)
    VALUES (
      ${entrada.grupoId}, ${entrada.usuarioId}, ${entrada.accion}, ${entrada.entidad},
      ${entrada.entidadId ?? null}, ${entrada.datos ? tx.json(entrada.datos) : null}
    )
  `;
}
