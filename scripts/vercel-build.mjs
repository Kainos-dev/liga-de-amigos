/**
 * Lo que corre Vercel al publicar (script "vercel-build" de package.json).
 *
 * En la publicación de PRODUCCIÓN, primero aplica las migraciones pendientes a
 * la base de producción y después compila. Si una migración falla, se corta
 * acá: no se publica nada y el sitio sigue con la versión anterior.
 *
 * En las versiones de prueba de Vercel (Preview) no toca ninguna base: solo
 * compila. En la compu de cada uno no se usa: ahí es `pnpm db:migrate`.
 */
import { execSync } from "node:child_process";

const entorno = process.env.VERCEL_ENV; // "production" | "preview" | "development"

function correr(comando) {
  console.log(`\n▶ ${comando}`);
  execSync(comando, { stdio: "inherit" });
}

if (entorno === "production") {
  if (!process.env.DATABASE_URL) {
    // Sin base, la app publicada no funcionaría: mejor frenar y avisar.
    console.error(
      "Falta DATABASE_URL en las variables de entorno de producción de Vercel. No se publica.",
    );
    process.exit(1);
  }
  console.log("Publicación de producción: aplicando migraciones pendientes…");
  correr("pnpm db:migrate");
} else {
  console.log(`Entorno "${entorno ?? "desconocido"}": no se aplican migraciones.`);
}

correr("pnpm build");
