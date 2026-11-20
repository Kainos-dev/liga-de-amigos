/**
 * Cifrado del PIN y tokens de sesión. Usa solo `node:crypto` (viene con Node).
 *
 * - El PIN se guarda con scrypt: un hash lento a propósito, con "sal" aleatoria,
 *   para que adivinar PINs a partir de la base sea muy costoso.
 * - El token de sesión es aleatorio. En la cookie va el token; en la base,
 *   solo su hash SHA-256.
 */
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  clave: string,
  sal: Buffer,
  largo: number,
) => Promise<Buffer>;

const LARGO_HASH = 64;

/** Devuelve "scrypt:<sal>:<hash>" en hexadecimal, listo para guardar. */
export async function cifrarPin(pin: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await scryptAsync(pin, sal, LARGO_HASH);
  return `scrypt:${sal.toString("hex")}:${hash.toString("hex")}`;
}

export async function verificarPin(pin: string, guardado: string): Promise<boolean> {
  const [algoritmo, salHex, hashHex] = guardado.split(":");
  if (algoritmo !== "scrypt" || !salHex || !hashHex) return false;

  const esperado = Buffer.from(hashHex, "hex");
  const calculado = await scryptAsync(pin, Buffer.from(salHex, "hex"), esperado.length);
  // timingSafeEqual tarda lo mismo acierte o no: no da pistas por el tiempo.
  return timingSafeEqual(calculado, esperado);
}

/** Token aleatorio para la cookie (32 bytes, apto para URLs). */
export function nuevoTokenDeSesion(): string {
  return randomBytes(32).toString("base64url");
}

export function hashDeToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
