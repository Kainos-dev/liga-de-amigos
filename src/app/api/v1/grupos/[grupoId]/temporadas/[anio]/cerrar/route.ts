import { manejar, validarId } from "@/server/api";
import { ErrorDeDominio } from "@/server/domain/errores";
import { cerrarTemporada } from "@/server/services/resumenes";
import { exigirUsuario } from "@/server/sesion";

type Contexto = RouteContext<"/api/v1/grupos/[grupoId]/temporadas/[anio]/cerrar">;

/** Cerrar una temporada (solo administradores, desde el 1 de enero). */
export const POST = manejar(async (_request, { params }: Contexto) => {
  const usuario = await exigirUsuario();
  const { grupoId, anio } = await params;
  if (!/^\d{4}$/.test(anio)) {
    throw new ErrorDeDominio("El año no es válido");
  }
  await cerrarTemporada(usuario.id, validarId(grupoId), Number(anio));
  return new Response(null, { status: 204 });
});
