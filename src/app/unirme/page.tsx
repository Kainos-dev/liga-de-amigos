import type { Metadata } from "next";
import Link from "next/link";
import { ExigirSesion } from "@/components/exigir-sesion";
import { FormularioUnirme } from "./formulario";

export const metadata: Metadata = { title: "Unirme a un grupo · Liga de Amigos" };

export default function PaginaUnirme() {
  return (
    <main className="mx-auto w-full max-w-md space-y-8 px-4 py-10">
      <ExigirSesion />
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Volver
      </Link>
      <div className="space-y-2">
        <h1 className="font-display text-5xl tracking-wide">Unirme</h1>
        <p className="text-muted-foreground">
          Escribí el código que te pasaron. Un administrador del grupo tiene que aceptarte.
        </p>
      </div>
      <FormularioUnirme />
    </main>
  );
}
