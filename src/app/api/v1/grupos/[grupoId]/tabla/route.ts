import { manejar, validarId } from "@/server/api";
import { ErrorDeDominio } from "@/server/domain/errores";
import { obtenerTabla } from "@/server/services/tabla";
import { exigirUsuario } from "@/server/sesion";

type Contexto = RouteContext<"/api/v1/grupos/[grupoId]/tabla">;

/** Tabla de la liga. Opcional: ?anio=2026 para ver otra temporada. */
export const GET = manejar(async (request, { params }: Contexto) => {
  const usuario = await exigirUsuario();
  const grupoId = validarId((await params).grupoId);

  const anioTexto = new URL(request.url).searchParams.get("anio");
  const anio = anioTexto === null ? undefined : Number(anioTexto);
  if (anio !== undefined && !Number.isInteger(anio)) {
    throw new ErrorDeDominio("El año no es válido");
  }

  return Response.json({ tabla: await obtenerTabla(usuario.id, grupoId, anio) });
});
