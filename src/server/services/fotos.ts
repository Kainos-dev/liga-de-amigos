import "server-only";
import { sql } from "@/server/db";
import { validarFoto } from "@/server/domain/fotos";

/**
 * Fragmento SQL que arma la dirección de la foto de un usuario, o NULL si no
 * tiene. Uso: SELECT ${urlDeFoto("u")} AS "fotoUrl" FROM usuarios u ...
 *
 * La dirección lleva ?v=<cuándo se cambió>: así el navegador la guarda en
 * caché para siempre y, cuando la foto cambia, la dirección cambia también.
 * sql(alias) escapa el nombre de la tabla: no se concatena texto a mano.
 */
export function urlDeFoto(alias: string) {
  const tabla = sql(alias);
  return sql`
    CASE WHEN ${tabla}.foto_actualizada_en IS NULL THEN NULL
    ELSE '/api/v1/usuarios/' || ${tabla}.id || '/foto?v='
         || floor(extract(epoch FROM ${tabla}.foto_actualizada_en) * 1000)::bigint
    END
  `;
}

export async function guardarFoto(usuarioId: string, bytes: Uint8Array): Promise<{ fotoUrl: string }> {
  const tipo = validarFoto(bytes);
  const [fila] = await sql<{ fotoUrl: string }[]>`
    UPDATE usuarios
    SET foto = ${Buffer.from(bytes)}, foto_tipo = ${tipo}, foto_actualizada_en = now()
    WHERE id = ${usuarioId}
    RETURNING ${urlDeFoto("usuarios")} AS "fotoUrl"
  `;
  return fila;
}

export async function borrarFoto(usuarioId: string): Promise<void> {
  await sql`
    UPDATE usuarios SET foto = NULL, foto_tipo = NULL, foto_actualizada_en = NULL
    WHERE id = ${usuarioId}
  `;
}

/**
 * La foto de un usuario, solo si quien la pide es esa persona o comparte con
 * ella algún grupo (como integrantes activos o pendiente de aceptación).
 * Los grupos son privados: las fotos también.
 */
export async function obtenerFoto(
  pedidaPor: string,
  usuarioId: string,
): Promise<{ bytes: Buffer; tipo: string } | null> {
  const [foto] = await sql<{ bytes: Buffer; tipo: string }[]>`
    SELECT u.foto AS bytes, u.foto_tipo AS tipo
    FROM usuarios u
    WHERE u.id = ${usuarioId} AND u.foto IS NOT NULL
      AND (
        u.id = ${pedidaPor}
        OR EXISTS (
          SELECT 1 FROM integrantes yo
          WHERE yo.usuario_id = ${pedidaPor} AND yo.egreso_en IS NULL
            AND (
              EXISTS (SELECT 1 FROM integrantes otro
                      WHERE otro.grupo_id = yo.grupo_id AND otro.usuario_id = u.id)
              -- Un admin tiene que poder ver la foto de quien pide entrar.
              OR EXISTS (SELECT 1 FROM solicitudes_ingreso s
                         WHERE s.grupo_id = yo.grupo_id AND s.usuario_id = u.id
                           AND s.estado = 'pendiente')
            )
        )
      )
  `;
  return foto ?? null;
}
