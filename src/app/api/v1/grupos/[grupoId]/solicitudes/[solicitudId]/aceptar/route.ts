import { leerJson, manejar, validarId } from "@/server/api";
import { esquemaAceptarSolicitud } from "@/server/domain/grupos";
import { aceptarSolicitud } from "@/server/services/solicitudes";
import { exigirUsuario } from "@/server/sesion";

type Contexto = RouteContext<"/api/v1/grupos/[grupoId]/solicitudes/[solicitudId]/aceptar">;

/**
 * Aceptar una solicitud (solo administradores).
 * Cuerpo: {} o { integranteId } para vincularla a un perfil sin cuenta.
 */
export const POST = manejar(async (request, { params }: Contexto) => {
  const usuario = await exigirUsuario();
  const { grupoId, solicitudId } = await params;
  const { integranteId } = await leerJson(request, esquemaAceptarSolicitud);
  await aceptarSolicitud(usuario.id, validarId(grupoId), validarId(solicitudId), integranteId);
  return new Response(null, { status: 204 });
});
