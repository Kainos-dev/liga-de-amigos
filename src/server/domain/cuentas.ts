/**
 * Reglas de las cuentas: sin email. Se entra con el nombre o apodo + PIN.
 * Por eso el nombre es único en toda la app (sin distinguir mayúsculas ni
 * espacios de más).
 *
 * Los esquemas de Zod validan lo que llega a la API. Están acá (y no en el
 * route handler) para que la futura app móvil y los tests usen las mismas reglas.
 */
import { z } from "zod";

/** "  El   Tano " → "El Tano": sin espacios al principio, al final ni repetidos. */
export function normalizarNombre(texto: string): string {
  return texto.trim().replace(/\s+/g, " ");
}

const pin = z
  .string()
  .min(6, { error: "El PIN tiene que tener al menos 6 caracteres" })
  .max(64, { error: "El PIN puede tener hasta 64 caracteres" });

export const esquemaCrearCuenta = z.object({
  nombre: z
    .string()
    .transform(normalizarNombre)
    .pipe(
      z
        .string()
        .min(2, { error: "El nombre tiene que tener al menos 2 caracteres" })
        .max(30, { error: "El nombre puede tener hasta 30 caracteres" }),
    ),
  pin,
});

export type DatosCrearCuenta = z.infer<typeof esquemaCrearCuenta>;

export const esquemaIniciarSesion = z.object({
  // Al entrar no se aplican las reglas de formato: si no coincide, es
  // simplemente "nombre o PIN incorrectos".
  nombre: z
    .string()
    .transform(normalizarNombre)
    .pipe(z.string().min(1, { error: "Escribí tu nombre o apodo" })),
  pin: z.string().min(1, { error: "Escribí tu PIN" }),
});

export const esquemaEliminarCuenta = z.object({
  pin: z.string().min(1, { error: "Escribí tu PIN para confirmar" }),
});

/** Cuánto dura una sesión abierta. */
export const DIAS_DE_SESION = 180;

/** Freno contra quien prueba PINs al azar. */
export const MAX_INTENTOS_FALLIDOS = 5;
export const MINUTOS_DE_BLOQUEO = 15;

/**
 * Qué hacer después de un PIN incorrecto: sumar el intento y, si llegó al
 * máximo, bloquear la cuenta un rato y reiniciar el contador.
 */
export function despuesDeUnIntentoFallido(
  intentosPrevios: number,
  ahora: Date,
): { intentos: number; bloqueadoHasta: Date | null } {
  const intentos = intentosPrevios + 1;
  if (intentos >= MAX_INTENTOS_FALLIDOS) {
    return {
      intentos: 0,
      bloqueadoHasta: new Date(ahora.getTime() + MINUTOS_DE_BLOQUEO * 60_000),
    };
  }
  return { intentos, bloqueadoHasta: null };
}
