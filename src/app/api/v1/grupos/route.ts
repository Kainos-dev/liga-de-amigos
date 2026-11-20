import { leerJson, manejar } from "@/server/api";
import { esquemaCrearGrupo } from "@/server/domain/grupos";
import { crearGrupo, misGrupos } from "@/server/services/grupos";
import { exigirUsuario } from "@/server/sesion";

/** Mis grupos. */
export const GET = manejar(async () => {
  const usuario = await exigirUsuario();
  return Response.json({ grupos: await misGrupos(usuario.id) });
});

/** Crear un grupo (quien lo crea queda como administrador). */
export const POST = manejar(async (request) => {
  const usuario = await exigirUsuario();
  const { nombre } = await leerJson(request, esquemaCrearGrupo);
  const grupo = await crearGrupo(usuario, nombre);
  return Response.json({ grupo }, { status: 201 });
});
