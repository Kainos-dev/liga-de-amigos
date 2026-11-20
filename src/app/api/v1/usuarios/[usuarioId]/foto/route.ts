import { esIdValido, manejar } from "@/server/api";
import { obtenerFoto } from "@/server/services/fotos";
import { exigirUsuario } from "@/server/sesion";

type Contexto = RouteContext<"/api/v1/usuarios/[usuarioId]/foto">;

/**
 * Foto de perfil de un usuario. Solo la ve esa persona o quien comparte un
 * grupo con ella. La dirección incluye ?v=<versión>, así que el navegador la
 * puede guardar en caché "para siempre": si la foto cambia, cambia la dirección.
 */
export const GET = manejar(async (_request, { params }: Contexto) => {
  const usuario = await exigirUsuario();
  const { usuarioId } = await params;

  const foto = esIdValido(usuarioId) ? await obtenerFoto(usuario.id, usuarioId) : null;
  if (!foto) {
    return new Response(null, { status: 404 });
  }

  return new Response(new Uint8Array(foto.bytes), {
    headers: {
      "Content-Type": foto.tipo,
      // private: la guarda el navegador de quien la pidió, no cachés compartidos.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
