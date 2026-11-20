import { manejar } from "@/server/api";
import { ErrorDeDominio } from "@/server/domain/errores";
import { TAMANO_MAXIMO_DE_FOTO } from "@/server/domain/fotos";
import { borrarFoto, guardarFoto } from "@/server/services/fotos";
import { exigirUsuario } from "@/server/sesion";

/**
 * Subir o cambiar la foto de perfil propia. El cuerpo es la imagen tal cual
 * (Content-Type: image/jpeg, image/png o image/webp), no JSON.
 * Como el Content-Type no es "simple", otro sitio no puede mandarla con la
 * cookie del usuario sin que el navegador lo frene (protección CSRF).
 */
export const PUT = manejar(async (request) => {
  const usuario = await exigirUsuario();

  if (!request.headers.get("content-type")?.startsWith("image/")) {
    throw new ErrorDeDominio("Mandá la foto como imagen");
  }
  const largo = Number(request.headers.get("content-length") ?? 0);
  if (largo > TAMANO_MAXIMO_DE_FOTO) {
    throw new ErrorDeDominio("La foto es muy pesada. Probá con otra");
  }

  const bytes = new Uint8Array(await request.arrayBuffer());
  return Response.json(await guardarFoto(usuario.id, bytes));
});

/** Sacar la foto: vuelve a mostrarse la inicial. */
export const DELETE = manejar(async () => {
  const usuario = await exigirUsuario();
  await borrarFoto(usuario.id);
  return new Response(null, { status: 204 });
});
