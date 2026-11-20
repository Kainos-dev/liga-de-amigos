import "server-only";
import { sql } from "@/server/db";
import { urlDeFoto } from "@/server/services/fotos";
import { ErrorDeDominio } from "@/server/domain/errores";
import { hoy } from "@/server/domain/fechas";
import { registrarAuditoria } from "@/server/services/auditoria";
import type { Usuario } from "@/server/services/cuentas";
import { exigirAdmin } from "@/server/services/permisos";

export type SolicitudVista = {
  id: string;
  nombre: string;
  usuario: string;
  fotoUrl: string | null;
  creadoEn: Date;
};

export type MiSolicitud = { id: string; grupoNombre: string; creadoEn: Date };

/**
 * Pedir entrar a un grupo con su código. Queda pendiente hasta que un
 * administrador la acepte. Si ya había una pendiente, no se duplica.
 */
export async function solicitarIngreso(
  usuario: Usuario,
  codigo: string,
): Promise<{ grupoNombre: string }> {
  const [grupo] = await sql<{ id: string; nombre: string }[]>`
    SELECT id, nombre FROM grupos WHERE codigo = ${codigo}
  `;
  if (!grupo) {
    throw new ErrorDeDominio("No encontramos ningún grupo con ese código");
  }

  const [yaEsta] = await sql`
    SELECT 1 FROM integrantes
    WHERE grupo_id = ${grupo.id} AND usuario_id = ${usuario.id} AND egreso_en IS NULL
  `;
  if (yaEsta) {
    throw new ErrorDeDominio(`Ya sos parte de ${grupo.nombre}`);
  }

  // ON CONFLICT ... DO NOTHING: si ya hay una pendiente, no pasa nada.
  await sql`
    INSERT INTO solicitudes_ingreso (grupo_id, usuario_id)
    VALUES (${grupo.id}, ${usuario.id})
    ON CONFLICT (grupo_id, usuario_id) WHERE estado = 'pendiente' DO NOTHING
  `;

  return { grupoNombre: grupo.nombre };
}

/** Solicitudes propias que todavía esperan respuesta. */
export async function misSolicitudesPendientes(usuarioId: string): Promise<MiSolicitud[]> {
  return sql<MiSolicitud[]>`
    SELECT s.id, g.nombre AS "grupoNombre", s.creado_en AS "creadoEn"
    FROM solicitudes_ingreso s
    JOIN grupos g ON g.id = s.grupo_id
    WHERE s.usuario_id = ${usuarioId} AND s.estado = 'pendiente'
    ORDER BY s.creado_en DESC
  `;
}

export async function listarSolicitudes(
  usuarioId: string,
  grupoId: string,
): Promise<SolicitudVista[]> {
  await exigirAdmin(usuarioId, grupoId);
  return sql<SolicitudVista[]>`
    SELECT s.id, u.nombre, u.usuario,
           ${urlDeFoto("u")} AS "fotoUrl",
           s.creado_en AS "creadoEn"
    FROM solicitudes_ingreso s
    JOIN usuarios u ON u.id = s.usuario_id
    WHERE s.grupo_id = ${grupoId} AND s.estado = 'pendiente'
    ORDER BY s.creado_en
  `;
}

/**
 * Aceptar una solicitud. Opcionalmente se vincula a un perfil sin cuenta que
 * ya existía (por ejemplo "Juli", cargada antes por el administrador): así la
 * persona se queda con ese historial y esos puntos.
 */
export async function aceptarSolicitud(
  usuarioId: string,
  grupoId: string,
  solicitudId: string,
  integranteId?: string,
): Promise<void> {
  await exigirAdmin(usuarioId, grupoId);

  await sql.begin(async (tx) => {
    // FOR UPDATE: si dos administradores aceptan a la vez, el segundo espera
    // y después ve que ya no está pendiente.
    const [solicitud] = await tx<{ usuarioId: string; nombre: string }[]>`
      SELECT s.usuario_id AS "usuarioId", u.nombre
      FROM solicitudes_ingreso s
      JOIN usuarios u ON u.id = s.usuario_id
      WHERE s.id = ${solicitudId} AND s.grupo_id = ${grupoId} AND s.estado = 'pendiente'
      FOR UPDATE OF s
    `;
    if (!solicitud) {
      throw new ErrorDeDominio("La solicitud ya no está pendiente");
    }

    // ¿Ya estuvo en el grupo y se fue? Se lo reincorpora con su perfil anterior.
    const [anterior] = await tx<{ id: string }[]>`
      SELECT id FROM integrantes
      WHERE grupo_id = ${grupoId} AND usuario_id = ${solicitud.usuarioId}
    `;

    let integranteFinal: string;

    if (anterior) {
      if (integranteId && integranteId !== anterior.id) {
        throw new ErrorDeDominio(
          "Esta persona ya estuvo en el grupo: se la reincorpora con su perfil anterior",
        );
      }
      await tx`UPDATE integrantes SET egreso_en = NULL WHERE id = ${anterior.id}`;
      integranteFinal = anterior.id;
    } else if (integranteId) {
      const [vinculado] = await tx<{ id: string }[]>`
        UPDATE integrantes
        SET usuario_id = ${solicitud.usuarioId}, nombre = ${solicitud.nombre}
        WHERE id = ${integranteId} AND grupo_id = ${grupoId}
          AND usuario_id IS NULL AND egreso_en IS NULL
        RETURNING id
      `;
      if (!vinculado) {
        throw new ErrorDeDominio("Ese perfil ya tiene cuenta o no está en el grupo");
      }
      integranteFinal = vinculado.id;
    } else {
      const [nuevo] = await tx<{ id: string }[]>`
        INSERT INTO integrantes (grupo_id, nombre, usuario_id, rol, ingreso_en)
        VALUES (${grupoId}, ${solicitud.nombre}, ${solicitud.usuarioId}, 'miembro', ${hoy()})
        RETURNING id
      `;
      integranteFinal = nuevo.id;
    }

    await tx`
      UPDATE solicitudes_ingreso
      SET estado = 'aceptada', resuelta_en = now(), resuelta_por = ${usuarioId}
      WHERE id = ${solicitudId}
    `;

    await registrarAuditoria(tx, {
      grupoId,
      usuarioId,
      accion: "solicitud.aceptar",
      entidad: "integrante",
      entidadId: integranteFinal,
      datos: { solicitudId, vinculadoAPerfilExistente: Boolean(integranteId || anterior) },
    });
  });
}

export async function rechazarSolicitud(
  usuarioId: string,
  grupoId: string,
  solicitudId: string,
): Promise<void> {
  await exigirAdmin(usuarioId, grupoId);

  await sql.begin(async (tx) => {
    const [rechazada] = await tx`
      UPDATE solicitudes_ingreso
      SET estado = 'rechazada', resuelta_en = now(), resuelta_por = ${usuarioId}
      WHERE id = ${solicitudId} AND grupo_id = ${grupoId} AND estado = 'pendiente'
      RETURNING id
    `;
    if (!rechazada) {
      throw new ErrorDeDominio("La solicitud ya no está pendiente");
    }
    await registrarAuditoria(tx, {
      grupoId,
      usuarioId,
      accion: "solicitud.rechazar",
      entidad: "solicitud",
      entidadId: solicitudId,
    });
  });
}
