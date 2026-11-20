"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Campo, MensajeDeError } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { llamarApi } from "@/lib/api-cliente";

export function FormularioEntrar() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);

    setEnviando(true);
    setError(null);
    const resultado = await llamarApi("POST", "/sesiones", {
      nombre: datos.get("nombre"),
      pin: datos.get("pin"),
    });
    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={enviar} className="space-y-5">
      <Campo
        id="nombre"
        name="nombre"
        etiqueta="Nombre o apodo"
        ayuda="El mismo con el que creaste la cuenta."
        autoComplete="username"
        required
      />
      <Campo
        id="pin"
        name="pin"
        type="password"
        etiqueta="PIN"
        autoComplete="current-password"
        required
      />

      <MensajeDeError mensaje={error} />

      <Button type="submit" size="lg" className="w-full" disabled={enviando}>
        {enviando ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
