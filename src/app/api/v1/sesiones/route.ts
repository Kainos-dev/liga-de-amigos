import { leerJson, manejar } from "@/server/api";
import { esquemaIniciarSesion } from "@/server/domain/cuentas";
import { cerrarSesion, iniciarSesion } from "@/server/services/cuentas";
import { borrarCookieDeSesion, guardarCookieDeSesion, tokenDeLaPeticion } from "@/server/sesion";

/** Entrar con usuario y PIN. */
export const POST = manejar(async (request) => {
  const { usuario, pin } = await leerJson(request, esquemaIniciarSesion);
  const sesion = await iniciarSesion(usuario, pin);
  await guardarCookieDeSesion(sesion.token, sesion.venceEn);
  return Response.json({ usuario: sesion.usuario });
});

/** Cerrar la sesión actual. */
export const DELETE = manejar(async () => {
  const token = await tokenDeLaPeticion();
  if (token) await cerrarSesion(token);
  await borrarCookieDeSesion();
  return new Response(null, { status: 204 });
});
