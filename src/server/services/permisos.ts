import "server-only";
import { sql } from "@/server/db";
import { ErrorSinPermiso } from "@/server/domain/errores";
import type { Rol } from "@/server/domain/grupos";

export type Membresia = { integranteId: string; rol: Rol };

/**
 * Verifica que el usuario sea integrante activo del grupo.
 * Todo service que lee o escribe datos de un grupo empieza por acá.
 */
export async function exigirIntegrante(usuarioId: string, grupoId: string): Promise<Membresia> {
  const [membresia] = await sql<Membresia[]>`
    SELECT id AS "integranteId", rol
    FROM integrantes
    WHERE grupo_id = ${grupoId} AND usuario_id = ${usuarioId} AND egreso_en IS NULL
  `;
  if (!membresia) {
    throw new ErrorSinPermiso("No sos parte de este grupo");
  }
  return membresia;
}

/** Igual que exigirIntegrante, pero además tiene que ser administrador. */
export async function exigirAdmin(usuarioId: string, grupoId: string): Promise<Membresia> {
  const membresia = await exigirIntegrante(usuarioId, grupoId);
  if (membresia.rol !== "admin") {
    throw new ErrorSinPermiso("Solo los administradores pueden hacer esto");
  }
  return membresia;
}
