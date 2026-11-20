import type { Metadata } from "next";
import Link from "next/link";
import { FormularioEntrar } from "./formulario";

export const metadata: Metadata = { title: "Entrar · Liga de Amigos" };

export default function PaginaEntrar() {
  return (
    <main className="mx-auto w-full max-w-md space-y-8 px-4 py-10">
      <h1 className="font-display text-5xl tracking-wide">Entrar</h1>

      <FormularioEntrar />

      <p className="text-center text-sm text-muted-foreground">
        ¿No tenés cuenta?{" "}
        <Link
          href="/crear-cuenta"
          className="font-medium text-amarillo underline-offset-4 hover:underline"
        >
          Creá una
        </Link>
      </p>
    </main>
  );
}
