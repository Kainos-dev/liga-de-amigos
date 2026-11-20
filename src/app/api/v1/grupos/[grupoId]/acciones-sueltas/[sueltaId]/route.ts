import { manejar, validarId } from "@/server/api";
import { eliminarAccionSuelta } from "@/server/services/acciones-sueltas";
import { exigirUsuario } from "@/server/sesion";

type Contexto = RouteContext<"/api/v1/grupos/[grupoId]/acciones-sueltas/[sueltaId]">;

export const DELETE = manejar(async (_request, { params }: Contexto) => {
  const usuario = await exigirUsuario();
  const { grupoId, sueltaId } = await params;
  await eliminarAccionSuelta(usuario.id, validarId(grupoId), validarId(sueltaId));
  return new Response(null, { status: 204 });
});
