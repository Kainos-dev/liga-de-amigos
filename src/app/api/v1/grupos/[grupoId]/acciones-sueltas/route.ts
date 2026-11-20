import { leerJson, manejar, validarId } from "@/server/api";
import { esquemaAccionSuelta } from "@/server/domain/juntadas";
import { crearAccionSuelta, listarAccionesSueltas } from "@/server/services/acciones-sueltas";
import { exigirUsuario } from "@/server/sesion";

type Contexto = RouteContext<"/api/v1/grupos/[grupoId]/acciones-sueltas">;

/** Últimos puntos sueltos (fuera de juntadas). */
export const GET = manejar(async (_request, { params }: Contexto) => {
  const usuario = await exigirUsuario();
  const grupoId = validarId((await params).grupoId);
  return Response.json({ accionesSueltas: await listarAccionesSueltas(usuario.id, grupoId) });
});

/** Cargar puntos sueltos a alguien (cualquier integrante). */
export const POST = manejar(async (request, { params }: Contexto) => {
  const usuario = await exigirUsuario();
  const grupoId = validarId((await params).grupoId);
  const datos = await leerJson(request, esquemaAccionSuelta);
  const accionSuelta = await crearAccionSuelta(usuario.id, grupoId, datos);
  return Response.json({ accionSuelta }, { status: 201 });
});
