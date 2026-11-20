import { leerJson, manejar } from "@/server/api";
import { esquemaSolicitarIngreso } from "@/server/domain/grupos";
import { misSolicitudesPendientes, solicitarIngreso } from "@/server/services/solicitudes";
import { exigirUsuario } from "@/server/sesion";

/** Mis solicitudes que esperan respuesta. */
export const GET = manejar(async () => {
  const usuario = await exigirUsuario();
  return Response.json({ solicitudes: await misSolicitudesPendientes(usuario.id) });
});

/** Pedir entrar a un grupo con su código. */
export const POST = manejar(async (request) => {
  const usuario = await exigirUsuario();
  const { codigo } = await leerJson(request, esquemaSolicitarIngreso);
  const resultado = await solicitarIngreso(usuario, codigo);
  return Response.json(resultado, { status: 201 });
});
