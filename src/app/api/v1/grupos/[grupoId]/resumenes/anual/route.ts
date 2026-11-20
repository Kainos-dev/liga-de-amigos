import { manejar, validarId } from "@/server/api";
import { ErrorDeDominio } from "@/server/domain/errores";
import { obtenerResumenAnual } from "@/server/services/resumenes";
import { exigirUsuario } from "@/server/sesion";

type Contexto = RouteContext<"/api/v1/grupos/[grupoId]/resumenes/anual">;

/** Resumen de la temporada. Opcional: ?anio=2026 (por defecto, la actual). */
export const GET = manejar(async (request, { params }: Contexto) => {
  const usuario = await exigirUsuario();
  const grupoId = validarId((await params).grupoId);
  const texto = new URL(request.url).searchParams.get("anio");
  const anio = texto === null ? undefined : Number(texto);
  if (anio !== undefined && !Number.isInteger(anio)) {
    throw new ErrorDeDominio("El año no es válido");
  }
  return Response.json(await obtenerResumenAnual(usuario.id, grupoId, anio));
});
