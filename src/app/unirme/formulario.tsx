"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Campo, MensajeDeError } from "@/components/campo";
import { Button, buttonVariants } from "@/components/ui/button";
import { llamarApi } from "@/lib/api-cliente";

export function FormularioUnirme() {
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [grupoPedido, setGrupoPedido] = useState<string | null>(null);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const codigo = new FormData(evento.currentTarget).get("codigo");

    setEnviando(true);
    setError(null);
    const resultado = await llamarApi<{ grupoNombre: string }>("POST", "/solicitudes", {
      codigo,
    });
    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    setGrupoPedido(resultado.datos.grupoNombre);
  }

  if (grupoPedido) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl bg-card p-4">
          <p className="font-heading text-lg font-semibold">¡Listo! Le pediste entrar a {grupoPedido}</p>
          <p className="text-sm text-muted-foreground">
            Cuando un administrador te acepte, lo vas a ver en tus grupos.
          </p>
        </div>
        <Link href="/" className={buttonVariants({ size: "lg", className: "w-full" })}>
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-5">
      <Campo
        id="codigo"
        name="codigo"
        etiqueta="Código del grupo"
        placeholder="K7M2QX"
        autoCapitalize="characters"
        autoComplete="off"
        className="h-14 w-full rounded-lg border border-input bg-input/30 px-3 text-center font-heading text-2xl tracking-[0.3em] uppercase outline-none placeholder:text-muted-foreground/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        required
      />
      <MensajeDeError mensaje={error} />
      <Button type="submit" size="lg" className="w-full" disabled={enviando}>
        {enviando ? "Enviando…" : "Pedir entrar"}
      </Button>
    </form>
  );
}
