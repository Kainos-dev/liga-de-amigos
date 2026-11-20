import { leerJson, manejar, validarId } from "@/server/api";
import { esquemaEditarAccion } from "@/server/domain/configuracion-acciones";
import { editarAccion } from "@/server/services/configuracion-acciones";
import { exigirUsuario } from "@/server/sesion";

type Contexto = RouteContext<"/api/v1/grupos/[grupoId]/acciones/[accionId]">;

/**
 * Cambiar una acción (solo administradores): { nombre?, puntos?, archivada? }.
 * Los puntos nuevos rigen desde hoy.
 */
export const PATCH = manejar(async (request, { params }: Contexto) => {
  const usuario = await exigirUsuario();
  const { grupoId, accionId } = await params;
  const cambios = await leerJson(request, esquemaEditarAccion);
  await editarAccion(usuario.id, validarId(grupoId), validarId(accionId), cambios);
  return new Response(null, { status: 204 });
});
