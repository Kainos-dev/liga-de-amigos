import { leerJson, manejar, validarId } from "@/server/api";
import { esquemaCambiarRol } from "@/server/domain/grupos";
import { cambiarRol, quitarIntegrante } from "@/server/services/integrantes";
import { exigirUsuario } from "@/server/sesion";

type Contexto = RouteContext<"/api/v1/grupos/[grupoId]/integrantes/[integranteId]">;

/** Cambiar el rol de un integrante (solo administradores). */
export const PATCH = manejar(async (request, { params }: Contexto) => {
  const usuario = await exigirUsuario();
  const { grupoId, integranteId } = await params;
  const { rol } = await leerJson(request, esquemaCambiarRol);
  await cambiarRol(usuario.id, validarId(grupoId), validarId(integranteId), rol);
  return new Response(null, { status: 204 });
});

/** Sacar a alguien del grupo (administradores) o salir uno mismo. */
export const DELETE = manejar(async (_request, { params }: Contexto) => {
  const usuario = await exigirUsuario();
  const { grupoId, integranteId } = await params;
  await quitarIntegrante(usuario.id, validarId(grupoId), validarId(integranteId));
  return new Response(null, { status: 204 });
});
