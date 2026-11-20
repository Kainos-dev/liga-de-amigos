import { leerJson, manejar, validarId } from "@/server/api";
import { esquemaCrearAccion } from "@/server/domain/configuracion-acciones";
import { accionesParaFormulario } from "@/server/services/acciones";
import { crearAccion, listarAccionesConfigurables } from "@/server/services/configuracion-acciones";
import { exigirUsuario } from "@/server/sesion";

type Contexto = RouteContext<"/api/v1/grupos/[grupoId]/acciones">;

/**
 * Acciones del grupo.
 * - Por defecto: las activas con sus puntos de hoy (para los formularios).
 * - Con ?todas=1: también las archivadas y cuántas veces se usó cada una.
 */
export const GET = manejar(async (request, { params }: Contexto) => {
  const usuario = await exigirUsuario();
  const grupoId = validarId((await params).grupoId);
  const todas = new URL(request.url).searchParams.get("todas") === "1";
  const acciones = todas
    ? await listarAccionesConfigurables(usuario.id, grupoId)
    : await accionesParaFormulario(usuario.id, grupoId);
  return Response.json({ acciones });
});

/** Crear una acción nueva (solo administradores). */
export const POST = manejar(async (request, { params }: Contexto) => {
  const usuario = await exigirUsuario();
  const grupoId = validarId((await params).grupoId);
  const datos = await leerJson(request, esquemaCrearAccion);
  const accion = await crearAccion(usuario.id, grupoId, datos);
  return Response.json({ accion }, { status: 201 });
});
