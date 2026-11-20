import { manejar, validarId } from "@/server/api";
import { regenerarCodigo } from "@/server/services/grupos";
import { exigirUsuario } from "@/server/sesion";

type Contexto = RouteContext<"/api/v1/grupos/[grupoId]/codigo">;

/** Generar un código nuevo; el anterior deja de servir (solo administradores). */
export const POST = manejar(async (_request, { params }: Contexto) => {
  const usuario = await exigirUsuario();
  const grupoId = validarId((await params).grupoId);
  return Response.json({ codigo: await regenerarCodigo(usuario.id, grupoId) });
});
