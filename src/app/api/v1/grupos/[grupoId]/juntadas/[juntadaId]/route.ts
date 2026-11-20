import { leerJson, manejar, validarId } from "@/server/api";
import { esquemaCancelarJuntada, esquemaJuntada } from "@/server/domain/juntadas";
import {
  cambiarCancelacion,
  editarJuntada,
  eliminarJuntada,
  obtenerJuntada,
} from "@/server/services/juntadas";
import { exigirUsuario } from "@/server/sesion";

type Contexto = RouteContext<"/api/v1/grupos/[grupoId]/juntadas/[juntadaId]">;

async function ids(params: Contexto["params"]) {
  const { grupoId, juntadaId } = await params;
  return { grupoId: validarId(grupoId), juntadaId: validarId(juntadaId) };
}

/** Detalle de la juntada con los puntos de cada persona. */
export const GET = manejar(async (_request, { params }: Contexto) => {
  const usuario = await exigirUsuario();
  const { grupoId, juntadaId } = await ids(params);
  return Response.json({ juntada: await obtenerJuntada(usuario.id, grupoId, juntadaId) });
});

/** Reemplazar todo el contenido de la juntada (mismo cuerpo que al crearla). */
export const PUT = manejar(async (request, { params }: Contexto) => {
  const usuario = await exigirUsuario();
  const { grupoId, juntadaId } = await ids(params);
  const datos = await leerJson(request, esquemaJuntada);
  await editarJuntada(usuario.id, grupoId, juntadaId, datos);
  return new Response(null, { status: 204 });
});

/** Cancelar o reactivar: { cancelada: true | false }. */
export const PATCH = manejar(async (request, { params }: Contexto) => {
  const usuario = await exigirUsuario();
  const { grupoId, juntadaId } = await ids(params);
  const { cancelada } = await leerJson(request, esquemaCancelarJuntada);
  await cambiarCancelacion(usuario.id, grupoId, juntadaId, cancelada);
  return new Response(null, { status: 204 });
});

export const DELETE = manejar(async (_request, { params }: Contexto) => {
  const usuario = await exigirUsuario();
  const { grupoId, juntadaId } = await ids(params);
  await eliminarJuntada(usuario.id, grupoId, juntadaId);
  return new Response(null, { status: 204 });
});
