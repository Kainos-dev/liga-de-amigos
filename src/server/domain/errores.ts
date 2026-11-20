/**
 * Errores esperables del negocio. Los route handlers los traducen a una
 * respuesta HTTP con el mensaje tal cual (por eso van en español y claros).
 */

/** Dato inválido o regla del negocio que no se cumple → 400 */
export class ErrorDeDominio extends Error {}

/** No hay sesión iniciada → 401 */
export class ErrorNoAutenticado extends Error {
  constructor(mensaje = "Tenés que entrar con tu cuenta") {
    super(mensaje);
  }
}

/** Hay sesión, pero no tiene permiso para esto → 403 */
export class ErrorSinPermiso extends Error {
  constructor(mensaje = "No tenés permiso para hacer esto") {
    super(mensaje);
  }
}
