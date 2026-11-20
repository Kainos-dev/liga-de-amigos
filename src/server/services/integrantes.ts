import "server-only";
import { sql } from "@/server/db";
import { ErrorDeDominio } from "@/server/domain/errores";
import { hoy } from "@/server/domain/fechas";
import { type Rol, validarQueQuedeUnAdmin } from "@/server/domain/grupos";
import { registrarAuditoria } from "@/server/services/auditoria";
import { exigirAdmin, exigirIntegrante } from "@/server/services/permisos";

/** Agregar a alguien que no usa la app (por ejemplo, para anotarlo en las juntadas). */
export async function agregarIntegranteSinCuenta(
  usuarioId: string,
  grupoId: string,
  nombre: string,
): Promise<{ id: string }> {
  await exigirAdmin(usuarioId, grupoId);

  return sql.begin(async (tx) => {
    const [integrante] = await tx<{ id: string }[]>`
      INSERT INTO integrantes (grupo_id, nombre, rol, ingreso_en)
      VALUES (${grupoId}, ${nombre}, 'miembro', ${hoy()})
      RETURNING id
    `;
    await registrarAuditoria(tx, {
      grupoId,
      usuarioId,
      accion: "integrante.agregar_sin_cuenta",
      entidad: "integrante",
      entidadId: integrante.id,
      datos: { nombre },
    });
    return integrante;
  });
}

export async function cambiarRol(
  usuarioId: string,
  grupoId: string,
  integranteId: string,
  rolNuevo: Rol,
): Promise<void> {
  await exigirAdmin(usuarioId, grupoId);

  await sql.begin(async (tx) => {
    // Bloqueamos a los administradores del grupo para que dos cambios
    // simultáneos no lo dejen sin ninguno.
    const admins = await tx`
      SELECT id FROM integrantes
      WHERE grupo_id = ${grupoId} AND rol = 'admin' AND egreso_en IS NULL
      FOR UPDATE
    `;

    const [integrante] = await tx<{ rol: Rol; tieneCuenta: boolean }[]>`
      SELECT rol, usuario_id IS NOT NULL AS "tieneCuenta"
      FROM integrantes
      WHERE id = ${integranteId} AND grupo_id = ${grupoId} AND egreso_en IS NULL
    `;
    if (!integrante) {
      throw new ErrorDeDominio("Ese integrante no está en el grupo");
    }
    if (rolNuevo === "admin" && !integrante.tieneCuenta) {
      throw new ErrorDeDominio("Un perfil sin cuenta no puede ser administrador");
    }

    validarQueQuedeUnAdmin({ rolActual: integrante.rol, rolNuevo }, admins.length);

    await tx`UPDATE integrantes SET rol = ${rolNuevo} WHERE id = ${integranteId}`;
    await registrarAuditoria(tx, {
      grupoId,
      usuarioId,
      accion: "integrante.cambiar_rol",
      entidad: "integrante",
      entidadId: integranteId,
      datos: { rolAnterior: integrante.rol, rolNuevo },
    });
  });
}

/**
 * Sacar a alguien del grupo (o salir uno mismo). No se borra: se marca la
 * fecha de egreso, así sus juntadas y puntos pasados siguen en el historial.
 */
export async function quitarIntegrante(
  usuarioId: string,
  grupoId: string,
  integranteId: string,
): Promise<void> {
  const membresia = await exigirIntegrante(usuarioId, grupoId);
  const esUnoMismo = membresia.integranteId === integranteId;
  if (!esUnoMismo) {
    await exigirAdmin(usuarioId, grupoId);
  }

  await sql.begin(async (tx) => {
    const admins = await tx`
      SELECT id FROM integrantes
      WHERE grupo_id = ${grupoId} AND rol = 'admin' AND egreso_en IS NULL
      FOR UPDATE
    `;

    const [integrante] = await tx<{ rol: Rol }[]>`
      SELECT rol FROM integrantes
      WHERE id = ${integranteId} AND grupo_id = ${grupoId} AND egreso_en IS NULL
    `;
    if (!integrante) {
      throw new ErrorDeDominio("Ese integrante no está en el grupo");
    }

    validarQueQuedeUnAdmin({ rolActual: integrante.rol, rolNuevo: null }, admins.length);

    // Si era admin, deja de serlo: si vuelve, entra como miembro.
    await tx`
      UPDATE integrantes SET egreso_en = ${hoy()}, rol = 'miembro' WHERE id = ${integranteId}
    `;
    await registrarAuditoria(tx, {
      grupoId,
      usuarioId,
      accion: esUnoMismo ? "integrante.salir" : "integrante.quitar",
      entidad: "integrante",
      entidadId: integranteId,
    });
  });
}
