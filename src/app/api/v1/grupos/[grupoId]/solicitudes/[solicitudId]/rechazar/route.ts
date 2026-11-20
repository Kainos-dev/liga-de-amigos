import { manejar, validarId } from "@/server/api";
import { rechazarSolicitud } from "@/server/services/solicitudes";
import { exigirUsuario } from "@/server/sesion";

type Contexto = RouteContext<"/api/v1/grupos/[grupoId]/solicitudes/[solicitudId]/rechazar">;

/** Rechazar una solicitud (solo administradores). */
export const POST = manejar(async (_request, { params }: Contexto) => {
  const usuario = await exigirUsuario();
  const { grupoId, solicitudId } = await params;
  await rechazarSolicitud(usuario.id, validarId(grupoId), validarId(solicitudId));
  return new Response(null, { status: 204 });
});
