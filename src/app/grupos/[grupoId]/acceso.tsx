import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { esIdValido } from "@/server/api";
import { ErrorDeDominio, ErrorSinPermiso } from "@/server/domain/errores";
import type { Usuario } from "@/server/services/cuentas";
import { type DetalleDeGrupo, obtenerGrupo } from "@/server/services/grupos";
import { usuarioActual } from "@/server/sesion";

/**
 * Para las páginas de un grupo: exige sesión (si no, manda a /entrar) y
 * devuelve el grupo, o null si no es integrante (la página muestra <SinAcceso />).
 */
export async function accederAlGrupo(
  grupoId: string,
): Promise<{ usuario: Usuario; grupo: DetalleDeGrupo } | null> {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/entrar");
  if (!esIdValido(grupoId)) return null;

  try {
    return { usuario, grupo: await obtenerGrupo(usuario.id, grupoId) };
  } catch (error) {
    if (error instanceof ErrorSinPermiso) return null;
    throw error;
  }
}

/** Corre una lectura y devuelve null si el recurso no existe o no es accesible. */
export async function oNulo<T>(lectura: () => Promise<T>): Promise<T | null> {
  try {
    return await lectura();
  } catch (error) {
    if (error instanceof ErrorSinPermiso || error instanceof ErrorDeDominio) return null;
    throw error;
  }
}

export function SinAcceso({ mensaje }: { mensaje?: string }) {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl tracking-wide">Sin acceso</h1>
      <p className="text-muted-foreground">
        {mensaje ??
          "No sos parte de este grupo. Si te pasaron el código, pedí entrar y esperá que te acepten."}
      </p>
      <Link href="/" className={buttonVariants({ size: "lg" })}>
        Ir al inicio
      </Link>
    </div>
  );
}

export function Volver({ href, texto }: { href: string; texto: string }) {
  return (
    <Link href={href} className="text-sm text-muted-foreground hover:text-foreground">
      ← {texto}
    </Link>
  );
}

// pb-32: deja lugar para la barra inferior fija.
export const CLASE_PAGINA = "mx-auto w-full max-w-md space-y-8 px-4 pt-8 pb-32";

/** Mientras carga: formas que anticipan el contenido (en lugar de "Cargando…"). */
export function Esqueleto() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando">
      <div className="h-14 w-2/3 animate-pulse rounded-xl bg-card" />
      <div className="h-44 animate-pulse rounded-3xl bg-card" />
      <div className="h-20 animate-pulse rounded-2xl bg-card" />
      <div className="h-20 animate-pulse rounded-2xl bg-card" />
    </div>
  );
}
