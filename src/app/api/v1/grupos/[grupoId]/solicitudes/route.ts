import { manejar, validarId } from "@/server/api";
import { listarSolicitudes } from "@/server/services/solicitudes";
import { exigirUsuario } from "@/server/sesion";

type Contexto = RouteContext<"/api/v1/grupos/[grupoId]/solicitudes">;

/** Solicitudes pendientes del grupo (solo administradores). */
export const GET = manejar(async (_request, { params }: Contexto) => {
  const usuario = await exigirUsuario();
  const grupoId = validarId((await params).grupoId);
  return Response.json({ solicitudes: await listarSolicitudes(usuario.id, grupoId) });
});
