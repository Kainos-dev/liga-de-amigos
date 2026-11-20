import type { Metadata } from "next";
import Link from "next/link";
import { ExigirSesion } from "@/components/exigir-sesion";
import { FormularioNuevoGrupo } from "./formulario";

export const metadata: Metadata = { title: "Crear grupo · Liga de Amigos" };

export default function PaginaNuevoGrupo() {
  return (
    <main className="mx-auto w-full max-w-md space-y-8 px-4 py-10">
      <ExigirSesion />
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Volver
      </Link>
      <div className="space-y-2">
        <h1 className="font-display text-5xl tracking-wide">Crear grupo</h1>
        <p className="text-muted-foreground">
          Vas a ser el administrador. Después compartís el código para que se sumen los demás.
        </p>
      </div>
      <FormularioNuevoGrupo />
    </main>
  );
}
