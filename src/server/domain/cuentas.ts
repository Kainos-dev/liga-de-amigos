/**
 * Reglas de las cuentas: sin email, con nombre de usuario + PIN.
 *
 * Los esquemas de Zod validan lo que llega a la API. Están acá (y no en el
 * route handler) para que la futura app móvil y los tests usen las mismas reglas.
 */
import { z } from "zod";
import { CLAVES_DE_COLOR, EMOJIS_DE_AVATAR } from "@/lib/avatares";

const usuario = z
  .string()
  .trim()
  .min(3, { error: "El usuario tiene que tener al menos 3 caracteres" })
  .max(20, { error: "El usuario puede tener hasta 20 caracteres" })
  .regex(/^[a-zA-Z0-9_.]+$/, {
    error: "El usuario solo puede tener letras, números, punto y guion bajo",
  });

const pin = z
  .string()
  .min(6, { error: "El PIN tiene que tener al menos 6 caracteres" })
  .max(64, { error: "El PIN puede tener hasta 64 caracteres" });

export const esquemaCrearCuenta = z.object({
  usuario,
  pin,
  nombre: z
    .string()
    .trim()
    .min(1, { error: "Poné un nombre o apodo" })
    .max(30, { error: "El nombre puede tener hasta 30 caracteres" }),
  avatarEmoji: z.enum(EMOJIS_DE_AVATAR, { error: "Elegí un emoji de la lista" }),
  avatarColor: z.enum(CLAVES_DE_COLOR, { error: "Elegí un color de la lista" }),
});

export type DatosCrearCuenta = z.infer<typeof esquemaCrearCuenta>;

export const esquemaIniciarSesion = z.object({
  // Al entrar no se aplican las reglas de formato: si no coincide, es
  // simplemente "usuario o PIN incorrectos".
  usuario: z.string().trim().min(1, { error: "Escribí tu usuario" }),
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
