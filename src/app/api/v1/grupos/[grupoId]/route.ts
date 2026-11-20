import { leerJson, manejar, validarId } from "@/server/api";
import { esquemaRenombrarGrupo } from "@/server/domain/grupos";
import { obtenerGrupo, renombrarGrupo } from "@/server/services/grupos";
import { exigirUsuario } from "@/server/sesion";

type Contexto = RouteContext<"/api/v1/grupos/[grupoId]">;

/** Datos del grupo e integrantes (solo para integrantes). */
export const GET = manejar(async (_request, { params }: Contexto) => {
  const usuario = await exigirUsuario();
  const grupoId = validarId((await params).grupoId);
  return Response.json({ grupo: await obtenerGrupo(usuario.id, grupoId) });
});

/** Cambiar el nombre del grupo (solo administradores). */
export const PATCH = manejar(async (request, { params }: Contexto) => {
  const usuario = await exigirUsuario();
  const grupoId = validarId((await params).grupoId);
  const { nombre } = await leerJson(request, esquemaRenombrarGrupo);
  await renombrarGrupo(usuario.id, grupoId, nombre);
  return new Response(null, { status: 204 });
});
