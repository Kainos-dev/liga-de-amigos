import { leerJson, manejar, validarId } from "@/server/api";
import { esquemaJuntada } from "@/server/domain/juntadas";
import { crearJuntada, listarJuntadas } from "@/server/services/juntadas";
import { exigirUsuario } from "@/server/sesion";

type Contexto = RouteContext<"/api/v1/grupos/[grupoId]/juntadas">;

/** Últimas juntadas del grupo. */
export const GET = manejar(async (_request, { params }: Contexto) => {
  const usuario = await exigirUsuario();
  const grupoId = validarId((await params).grupoId);
  return Response.json({ juntadas: await listarJuntadas(usuario.id, grupoId) });
});

/** Registrar una juntada (cualquier integrante). */
export const POST = manejar(async (request, { params }: Contexto) => {
  const usuario = await exigirUsuario();
  const grupoId = validarId((await params).grupoId);
  const datos = await leerJson(request, esquemaJuntada);
  const juntada = await crearJuntada(usuario.id, grupoId, datos);
  return Response.json({ juntada }, { status: 201 });
});
