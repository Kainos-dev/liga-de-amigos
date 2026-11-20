/**
 * Llamadas a nuestra API desde el navegador.
 * Devuelve siempre { ok, datos } o { ok: false, error } para que los
 * formularios muestren el mensaje sin tener que manejar excepciones.
 */
export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string };

export async function llamarApi<T = unknown>(
  metodo: "GET" | "POST" | "PATCH" | "DELETE",
  ruta: string,
  cuerpo?: unknown,
): Promise<Resultado<T>> {
  try {
    const respuesta = await fetch(`/api/v1${ruta}`, {
      method: metodo,
      headers: cuerpo === undefined ? undefined : { "Content-Type": "application/json" },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });

    if (respuesta.status === 204) return { ok: true, datos: undefined as T };

    const json = await respuesta.json();
    if (!respuesta.ok) {
      return { ok: false, error: json.error ?? "Algo salió mal" };
    }
    return { ok: true, datos: json as T };
  } catch {
    return { ok: false, error: "No hay conexión. Revisá internet y probá de nuevo" };
  }
}
