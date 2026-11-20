import "server-only";
import type { TransactionSql } from "postgres";
import { sql } from "@/server/db";
import { urlDeFoto } from "@/server/services/fotos";
import { ACCIONES_POR_DEFECTO } from "@/server/domain/acciones";
import { hoy } from "@/server/domain/fechas";
import { generarCodigo, type Rol } from "@/server/domain/grupos";
import { anioDeTemporada, inicioYFin } from "@/server/domain/temporadas";
import { registrarAuditoria } from "@/server/services/auditoria";
import type { Usuario } from "@/server/services/cuentas";
import { exigirAdmin, exigirIntegrante } from "@/server/services/permisos";

export type ResumenDeGrupo = {
  id: string;
  nombre: string;
  rol: Rol;
  cantidadDeIntegrantes: number;
  solicitudesPendientes: number; // solo se cuenta para administradores
};

export type IntegranteVista = {
  id: string;
  nombre: string;
  rol: Rol;
  tieneCuenta: boolean;
  fotoUrl: string | null; // null si no tiene cuenta o no subió foto
  ingresoEn: string; // AAAA-MM-DD
};

export type DetalleDeGrupo = {
  id: string;
  nombre: string;
  codigo: string;
  miRol: Rol;
  miIntegranteId: string;
  integrantes: IntegranteVista[];
};

/**
 * Crea el grupo con todo lo necesario para empezar a jugar:
 * quien lo crea como administrador, la temporada del año y la lista de
 * acciones por defecto (con sus puntos vigentes desde el inicio de la temporada).
 */
export async function crearGrupo(usuario: Usuario, nombre: string): Promise<{ id: string }> {
  const fecha = hoy();
  const { inicio, fin } = inicioYFin(anioDeTemporada(fecha));

  return sql.begin(async (tx) => {
    const codigo = await codigoLibre(tx);
    const [grupo] = await tx<{ id: string }[]>`
      INSERT INTO grupos (nombre, codigo) VALUES (${nombre}, ${codigo}) RETURNING id
    `;

    await tx`
      INSERT INTO integrantes (grupo_id, nombre, usuario_id, rol, ingreso_en)
      VALUES (${grupo.id}, ${usuario.nombre}, ${usuario.id}, 'admin', ${fecha})
    `;

    await tx`
      INSERT INTO temporadas (grupo_id, anio, inicio, fin)
      VALUES (${grupo.id}, ${anioDeTemporada(fecha)}, ${inicio}, ${fin})
    `;

    // Inserción de varias filas de una vez: tx(filas, columnas...) arma el VALUES.
    const filasDeAcciones = ACCIONES_POR_DEFECTO.map((accion) => ({
      grupo_id: grupo.id,
      clave: accion.clave,
      nombre: accion.nombre,
    }));
    const acciones = await tx<{ id: string; nombre: string }[]>`
      INSERT INTO acciones ${tx(filasDeAcciones, "grupo_id", "clave", "nombre")}
      RETURNING id, nombre
    `;

    const filasDePuntos = acciones.map((accion) => ({
      accion_id: accion.id,
      puntos: ACCIONES_POR_DEFECTO.find((a) => a.nombre === accion.nombre)!.puntos,
      vigente_desde: inicio,
    }));
    await tx`
      INSERT INTO acciones_puntos ${tx(filasDePuntos, "accion_id", "puntos", "vigente_desde")}
    `;

    await registrarAuditoria(tx, {
      grupoId: grupo.id,
      usuarioId: usuario.id,
      accion: "grupo.crear",
      entidad: "grupo",
      entidadId: grupo.id,
      datos: { nombre },
    });

    return grupo;
  });
}

/** Grupos en los que el usuario es integrante activo. */
export async function misGrupos(usuarioId: string): Promise<ResumenDeGrupo[]> {
  return sql<ResumenDeGrupo[]>`
    SELECT
      g.id,
      g.nombre,
      i.rol,
      (SELECT count(*)::int FROM integrantes x
        WHERE x.grupo_id = g.id AND x.egreso_en IS NULL) AS "cantidadDeIntegrantes",
      CASE WHEN i.rol = 'admin' THEN
        (SELECT count(*)::int FROM solicitudes_ingreso s
          WHERE s.grupo_id = g.id AND s.estado = 'pendiente')
      ELSE 0 END AS "solicitudesPendientes"
    FROM integrantes i
    JOIN grupos g ON g.id = i.grupo_id
    WHERE i.usuario_id = ${usuarioId} AND i.egreso_en IS NULL
    ORDER BY lower(g.nombre)
  `;
}

export async function obtenerGrupo(usuarioId: string, grupoId: string): Promise<DetalleDeGrupo> {
  const membresia = await exigirIntegrante(usuarioId, grupoId);

  const [grupo] = await sql<{ id: string; nombre: string; codigo: string }[]>`
    SELECT id, nombre, codigo FROM grupos WHERE id = ${grupoId}
  `;

  // ingreso_en::text: así la fecha llega como "AAAA-MM-DD" y no como Date con hora.
  const integrantes = await sql<IntegranteVista[]>`
    SELECT
      i.id, i.nombre, i.rol,
      i.usuario_id IS NOT NULL AS "tieneCuenta",
      ${urlDeFoto("u")} AS "fotoUrl",
      i.ingreso_en::text AS "ingresoEn"
    FROM integrantes i
    LEFT JOIN usuarios u ON u.id = i.usuario_id
    WHERE i.grupo_id = ${grupoId} AND i.egreso_en IS NULL
    ORDER BY i.rol = 'admin' DESC, lower(i.nombre)
  `;

  return {
    ...grupo,
    miRol: membresia.rol,
    miIntegranteId: membresia.integranteId,
    integrantes,
  };
}

export async function renombrarGrupo(
  usuarioId: string,
  grupoId: string,
  nombre: string,
): Promise<void> {
  await exigirAdmin(usuarioId, grupoId);
  await sql.begin(async (tx) => {
    await tx`UPDATE grupos SET nombre = ${nombre} WHERE id = ${grupoId}`;
    await registrarAuditoria(tx, {
      grupoId,
      usuarioId,
      accion: "grupo.renombrar",
      entidad: "grupo",
      entidadId: grupoId,
      datos: { nombre },
    });
  });
}

/** Código nuevo (el anterior deja de servir). Útil si se filtró. */
export async function regenerarCodigo(usuarioId: string, grupoId: string): Promise<string> {
  await exigirAdmin(usuarioId, grupoId);
  return sql.begin(async (tx) => {
    const codigo = await codigoLibre(tx);
    await tx`UPDATE grupos SET codigo = ${codigo} WHERE id = ${grupoId}`;
    await registrarAuditoria(tx, {
      grupoId,
      usuarioId,
      accion: "grupo.regenerar_codigo",
      entidad: "grupo",
      entidadId: grupoId,
    });
    return codigo;
  });
}

/**
 * Un código que no use otro grupo. Con 29^6 (unos 600 millones) de
 * combinaciones casi nunca hace falta más de un intento.
 */
async function codigoLibre(tx: TransactionSql): Promise<string> {
  for (let intento = 0; intento < 10; intento++) {
    const codigo = generarCodigo();
    const [usado] = await tx`SELECT 1 FROM grupos WHERE codigo = ${codigo}`;
    if (!usado) return codigo;
  }
  throw new Error("No se pudo generar un código de grupo libre");
}
