import { leerJson, manejar } from "@/server/api";
import { esquemaEliminarCuenta } from "@/server/domain/cuentas";
import { eliminarCuenta } from "@/server/services/cuentas";
import { borrarCookieDeSesion, exigirUsuario } from "@/server/sesion";

/** Datos de la cuenta con sesión iniciada. */
export const GET = manejar(async () => {
  const usuario = await exigirUsuario();
  return Response.json({ usuario });
});

/** Eliminar la cuenta propia. Pide el PIN en el cuerpo para confirmar. */
export const DELETE = manejar(async (request) => {
  const usuario = await exigirUsuario();
  const { pin } = await leerJson(request, esquemaEliminarCuenta);
  await eliminarCuenta(usuario.id, pin);
  await borrarCookieDeSesion();
  return new Response(null, { status: 204 });
});
