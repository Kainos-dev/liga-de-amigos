import { leerJson, manejar } from "@/server/api";
import { esquemaCrearCuenta } from "@/server/domain/cuentas";
import { crearCuenta } from "@/server/services/cuentas";
import { guardarCookieDeSesion } from "@/server/sesion";

/** Crear una cuenta. Deja la sesión iniciada. */
export const POST = manejar(async (request) => {
  const datos = await leerJson(request, esquemaCrearCuenta);
  const sesion = await crearCuenta(datos);
  await guardarCookieDeSesion(sesion.token, sesion.venceEn);
  return Response.json({ usuario: sesion.usuario }, { status: 201 });
});
