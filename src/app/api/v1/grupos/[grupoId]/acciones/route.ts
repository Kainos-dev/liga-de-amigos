import { manejar, validarId } from "@/server/api";
import { accionesParaFormulario } from "@/server/services/acciones";
import { exigirUsuario } from "@/server/sesion";

type Contexto = RouteContext<"/api/v1/grupos/[grupoId]/acciones">;

/** Acciones activas del grupo con sus puntos de hoy. */
export const GET = manejar(async (_request, { params }: Contexto) => {
  const usuario = await exigirUsuario();
  const grupoId = validarId((await params).grupoId);
  return Response.json({ acciones: await accionesParaFormulario(usuario.id, grupoId) });
});
