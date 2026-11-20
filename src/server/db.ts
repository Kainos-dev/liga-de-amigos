import "server-only";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Falta la variable de entorno DATABASE_URL (ver .env.example)");
}

/**
 * Conexión única a Postgres (Neon).
 *
 * Uso:
 *   const filas = await sql`SELECT * FROM grupos WHERE id = ${grupoId}`;
 *
 * Los valores dentro de ${} viajan como parámetros: no hay inyección SQL.
 * Para transacciones: await sql.begin(async (tx) => { ... });
 */
export const sql = postgres(databaseUrl, {
  // Neon cierra conexiones inactivas; no conviene retenerlas mucho tiempo.
  idle_timeout: 20,
  max: 10,
});
