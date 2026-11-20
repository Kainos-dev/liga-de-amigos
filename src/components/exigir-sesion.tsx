import { redirect } from "next/navigation";
import { Suspense } from "react";
import { usuarioActual } from "@/server/sesion";

/**
 * Manda a /entrar si no hay sesión. Se pone en páginas que la necesitan.
 * (La seguridad real está en la API: esto es para no mostrar un formulario
 * que igual va a fallar.)
 */
export function ExigirSesion() {
  return (
    <Suspense fallback={null}>
      <Verificar />
    </Suspense>
  );
}

async function Verificar() {
  if (!(await usuarioActual())) redirect("/entrar");
  return null;
}
