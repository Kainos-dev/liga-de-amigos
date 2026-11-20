import "server-only";
import { sql } from "@/server/db";
import {
  cifrarPin,
  hashDeToken,
  nuevoTokenDeSesion,
  verificarPin,
} from "@/server/auth/credenciales";
import {
  DIAS_DE_SESION,
  type DatosCrearCuenta,
  despuesDeUnIntentoFallido,
} from "@/server/domain/cuentas";
import { ErrorDeDominio, ErrorNoAutenticado } from "@/server/domain/errores";

/** Lo que se muestra de un usuario. Nunca incluye el hash del PIN. */
export type Usuario = {
  id: string;
  usuario: string;
  nombre: string;
  avatarEmoji: string;
  avatarColor: string;
};

export type SesionNueva = {
  token: string;
  venceEn: Date;
  usuario: Usuario;
};

const MENSAJE_CREDENCIALES = "Usuario o PIN incorrectos";

export async function crearCuenta(datos: DatosCrearCuenta): Promise<SesionNueva> {
  const pinHash = await cifrarPin(datos.pin);

  try {
    const [usuario] = await sql<Usuario[]>`
      INSERT INTO usuarios (usuario, nombre, avatar_emoji, avatar_color, pin_hash)
      VALUES (${datos.usuario}, ${datos.nombre}, ${datos.avatarEmoji}, ${datos.avatarColor}, ${pinHash})
      RETURNING id, usuario, nombre, avatar_emoji AS "avatarEmoji", avatar_color AS "avatarColor"
    `;
    return await abrirSesion(usuario);
  } catch (error) {
    if (esViolacionDeUnicidad(error, "usuarios_usuario_unico")) {
      throw new ErrorDeDominio("Ese usuario ya existe, probá con otro");
    }
    throw error;
  }
}

export async function iniciarSesion(usuario: string, pin: string): Promise<SesionNueva> {
  const [fila] = await sql<(Usuario & { pinHash: string; intentosFallidos: number; bloqueadoHasta: Date | null })[]>`
    SELECT id, usuario, nombre, avatar_emoji AS "avatarEmoji", avatar_color AS "avatarColor",
           pin_hash AS "pinHash", intentos_fallidos AS "intentosFallidos",
           bloqueado_hasta AS "bloqueadoHasta"
    FROM usuarios
    WHERE lower(usuario) = lower(${usuario})
  `;

  if (!fila) {
    throw new ErrorDeDominio(MENSAJE_CREDENCIALES);
  }

  const ahora = new Date();
  if (fila.bloqueadoHasta && fila.bloqueadoHasta > ahora) {
    throw new ErrorDeDominio(
      "Hubo demasiados intentos fallidos. Esperá unos minutos y probá de nuevo",
    );
  }

  if (!(await verificarPin(pin, fila.pinHash))) {
    const { intentos, bloqueadoHasta } = despuesDeUnIntentoFallido(fila.intentosFallidos, ahora);
    await sql`
      UPDATE usuarios
      SET intentos_fallidos = ${intentos}, bloqueado_hasta = ${bloqueadoHasta}
      WHERE id = ${fila.id}
    `;
    throw new ErrorDeDominio(MENSAJE_CREDENCIALES);
  }

  await sql`
    UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ${fila.id}
  `;

  return abrirSesion({
    id: fila.id,
    usuario: fila.usuario,
    nombre: fila.nombre,
    avatarEmoji: fila.avatarEmoji,
    avatarColor: fila.avatarColor,
  });
}

/** Usuario dueño de un token de sesión vigente, o null. */
export async function usuarioDeLaSesion(token: string): Promise<Usuario | null> {
  const [usuario] = await sql<Usuario[]>`
    SELECT u.id, u.usuario, u.nombre, u.avatar_emoji AS "avatarEmoji", u.avatar_color AS "avatarColor"
    FROM sesiones s
    JOIN usuarios u ON u.id = s.usuario_id
    WHERE s.token_hash = ${hashDeToken(token)} AND s.vence_en > now()
  `;
  return usuario ?? null;
}

export async function cerrarSesion(token: string): Promise<void> {
  await sql`DELETE FROM sesiones WHERE token_hash = ${hashDeToken(token)}`;
}

/**
 * Elimina la cuenta (pide el PIN para confirmar). Sus sesiones se borran solas
 * y, en los grupos, su perfil queda como integrante sin cuenta, con su
 * historial y sus puntos (lo resuelve la base con ON DELETE SET NULL).
 */
export async function eliminarCuenta(usuarioId: string, pin: string): Promise<void> {
  const [fila] = await sql<{ pinHash: string }[]>`
    SELECT pin_hash AS "pinHash" FROM usuarios WHERE id = ${usuarioId}
  `;
  if (!fila) {
    throw new ErrorNoAutenticado();
  }
  if (!(await verificarPin(pin, fila.pinHash))) {
    throw new ErrorDeDominio("El PIN no es correcto");
  }

  // Un grupo no puede quedarse sin administradores.
  const gruposSinOtroAdmin = await sql<{ nombre: string }[]>`
    SELECT g.nombre
    FROM integrantes i
    JOIN grupos g ON g.id = i.grupo_id
    WHERE i.usuario_id = ${usuarioId} AND i.rol = 'admin' AND i.egreso_en IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM integrantes otro
        WHERE otro.grupo_id = i.grupo_id AND otro.rol = 'admin'
          AND otro.egreso_en IS NULL AND otro.id <> i.id
      )
  `;
  if (gruposSinOtroAdmin.length > 0) {
    const nombres = gruposSinOtroAdmin.map((g) => g.nombre).join(", ");
    throw new ErrorDeDominio(
      `Sos el único administrador de: ${nombres}. Nombrá a otro antes de eliminar tu cuenta`,
    );
  }

  await sql.begin(async (tx) => {
    // Su perfil queda en los grupos sin cuenta, y un perfil sin cuenta no es admin.
    await tx`UPDATE integrantes SET rol = 'miembro' WHERE usuario_id = ${usuarioId}`;
    await tx`DELETE FROM usuarios WHERE id = ${usuarioId}`;
  });
}

async function abrirSesion(usuario: Usuario): Promise<SesionNueva> {
  const token = nuevoTokenDeSesion();
  const venceEn = new Date(Date.now() + DIAS_DE_SESION * 24 * 60 * 60 * 1000);

  await sql`
    INSERT INTO sesiones (usuario_id, token_hash, vence_en)
    VALUES (${usuario.id}, ${hashDeToken(token)}, ${venceEn})
  `;
  // De paso, limpiamos sesiones vencidas de este usuario.
  await sql`DELETE FROM sesiones WHERE usuario_id = ${usuario.id} AND vence_en <= now()`;

  return { token, venceEn, usuario };
}

/** ¿El error es de Postgres por un índice único en particular? (código 23505) */
function esViolacionDeUnicidad(error: unknown, indice: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505" &&
    "constraint_name" in error &&
    error.constraint_name === indice
  );
}
