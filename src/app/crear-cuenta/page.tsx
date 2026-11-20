import type { Metadata } from "next";
import Link from "next/link";
import { FormularioCrearCuenta } from "./formulario";

export const metadata: Metadata = { title: "Crear cuenta · Liga de Amigos" };

export default function PaginaCrearCuenta() {
  return (
    <main className="mx-auto w-full max-w-md space-y-8 px-4 py-10">
      <div className="space-y-2">
        <h1 className="font-display text-5xl tracking-wide">Crear cuenta</h1>
        <p className="text-muted-foreground">
          Sin email ni verificaciones: elegí cómo te van a ver y listo.
        </p>
      </div>

      <FormularioCrearCuenta />

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tenés cuenta?{" "}
        <Link href="/entrar" className="font-medium text-amarillo underline-offset-4 hover:underline">
          Entrá
        </Link>
      </p>
    </main>
  );
}
