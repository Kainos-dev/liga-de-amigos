import { manejar, validarId } from "@/server/api";
import { ErrorDeDominio } from "@/server/domain/errores";
import { obtenerResumenMensual } from "@/server/services/resumenes";
import { exigirUsuario } from "@/server/sesion";

type Contexto = RouteContext<"/api/v1/grupos/[grupoId]/resumenes/mensual">;

/** Resumen de un mes. Opcional: ?mes=2026-11 (por defecto, el mes actual). */
export const GET = manejar(async (request, { params }: Contexto) => {
  const usuario = await exigirUsuario();
  const grupoId = validarId((await params).grupoId);
  const mes = new URL(request.url).searchParams.get("mes") ?? undefined;
  if (mes !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
    throw new ErrorDeDominio("El mes tiene que ser AAAA-MM");
  }
  return Response.json(await obtenerResumenMensual(usuario.id, grupoId, mes));
});
