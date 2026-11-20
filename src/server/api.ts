/**
 * Ayudas para los route handlers de /api/v1.
 *
 * Uso típico:
 *   export const POST = manejar(async (request) => {
 *     const datos = await leerJson(request, esquema);
 *     ...
 *     return Response.json(resultado);
 *   });
 */
import "server-only";
import { z } from "zod";
import {
  ErrorDeDominio,
  ErrorNoAutenticado,
  ErrorSinPermiso,
} from "@/server/domain/errores";

/** Respuesta de error con el mismo formato siempre: { error: "mensaje" } */
function responderError(estado: number, mensaje: string): Response {
  return Response.json({ error: mensaje }, { status: estado });
}

/**
 * Envuelve un handler y traduce los errores conocidos a respuestas HTTP.
 * Cualquier otro error se registra y devuelve un 500 genérico (sin detalles
 * internos para el cliente).
 */
export function manejar<Contexto>(
  handler: (request: Request, contexto: Contexto) => Promise<Response>,
) {
  return async (request: Request, contexto: Contexto): Promise<Response> => {
    try {
      return await handler(request, contexto);
    } catch (error) {
      if (error instanceof ErrorDeDominio) return responderError(400, error.message);
      if (error instanceof ErrorNoAutenticado) return responderError(401, error.message);
      if (error instanceof ErrorSinPermiso) return responderError(403, error.message);
      console.error(error);
      // En desarrollo agregamos el detalle para poder diagnosticar; en producción nunca.
      if (process.env.NODE_ENV === "development") {
        return Response.json(
          { error: "Algo salió mal. Probá de nuevo en un rato", detalle: String(error) },
          { status: 500 },
        );
      }
      return responderError(500, "Algo salió mal. Probá de nuevo en un rato");
    }
  };
}

export function esIdValido(valor: string): boolean {
  return z.uuid().safeParse(valor).success;
}

/** Valida que un id de la URL tenga formato de uuid (si no, Postgres daría un 500). */
export function validarId(valor: string): string {
  if (!esIdValido(valor)) {
    throw new ErrorDeDominio("El identificador de la dirección no es válido");
  }
  return valor;
}

/**
 * Lee el cuerpo JSON y lo valida con un esquema de Zod.
 *
 * Exigir "Content-Type: application/json" también protege contra CSRF: otro
 * sitio no puede mandar JSON a nuestra API con la cookie del usuario sin que
 * el navegador lo frene antes.
 */
export async function leerJson<Esquema extends z.ZodType>(
  request: Request,
  esquema: Esquema,
): Promise<z.infer<Esquema>> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw new ErrorDeDominio("La petición tiene que ser JSON");
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    throw new ErrorDeDominio("El JSON de la petición no es válido");
  }

  const resultado = esquema.safeParse(cuerpo);
  if (!resultado.success) {
    throw new ErrorDeDominio(resultado.error.issues[0]?.message ?? "Datos inválidos");
  }
  return resultado.data;
}
