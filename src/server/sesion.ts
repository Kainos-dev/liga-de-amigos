/**
 * Sesión de la petición actual.
 *
 * El navegador manda el token en una cookie httpOnly (el JavaScript de la
 * página no la puede leer). Una futura app móvil lo puede mandar en el
 * header "Authorization: Bearer <token>". Las dos formas sirven igual.
 */
import "server-only";
import { cookies, headers } from "next/headers";
import { ErrorNoAutenticado } from "@/server/domain/errores";
import { type Usuario, usuarioDeLaSesion } from "@/server/services/cuentas";

const NOMBRE_COOKIE = "liga_sesion";

export async function tokenDeLaPeticion(): Promise<string | null> {
  const autorizacion = (await headers()).get("authorization");
  if (autorizacion?.startsWith("Bearer ")) {
    return autorizacion.slice("Bearer ".length).trim() || null;
  }
  return (await cookies()).get(NOMBRE_COOKIE)?.value ?? null;
}

/** Usuario con sesión iniciada, o null si no entró. */
export async function usuarioActual(): Promise<Usuario | null> {
  const token = await tokenDeLaPeticion();
  return token ? usuarioDeLaSesion(token) : null;
}

/** Igual que usuarioActual, pero corta con 401 si no hay sesión. */
export async function exigirUsuario(): Promise<Usuario> {
  const usuario = await usuarioActual();
  if (!usuario) throw new ErrorNoAutenticado();
  return usuario;
}

/** Solo en route handlers o server functions (ahí se pueden escribir cookies). */
export async function guardarCookieDeSesion(token: string, venceEn: Date): Promise<void> {
  (await cookies()).set(NOMBRE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: venceEn,
  });
}

export async function borrarCookieDeSesion(): Promise<void> {
  (await cookies()).delete(NOMBRE_COOKIE);
}
