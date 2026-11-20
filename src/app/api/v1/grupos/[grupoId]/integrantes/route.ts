import { leerJson, manejar, validarId } from "@/server/api";
import { esquemaAgregarIntegrante } from "@/server/domain/grupos";
import { agregarIntegranteSinCuenta } from "@/server/services/integrantes";
import { exigirUsuario } from "@/server/sesion";

type Contexto = RouteContext<"/api/v1/grupos/[grupoId]/integrantes">;

/** Agregar un integrante sin cuenta (solo administradores). */
export const POST = manejar(async (request, { params }: Contexto) => {
  const usuario = await exigirUsuario();
  const grupoId = validarId((await params).grupoId);
  const { nombre } = await leerJson(request, esquemaAgregarIntegrante);
  const integrante = await agregarIntegranteSinCuenta(usuario.id, grupoId, nombre);
  return Response.json({ integrante }, { status: 201 });
});
