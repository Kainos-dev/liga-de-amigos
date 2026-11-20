"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Campo, MensajeDeError } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { llamarApi } from "@/lib/api-cliente";

export function FormularioNuevoGrupo() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const nombre = new FormData(evento.currentTarget).get("nombre");

    setEnviando(true);
    setError(null);
    const resultado = await llamarApi<{ grupo: { id: string } }>("POST", "/grupos", { nombre });

    if (!resultado.ok) {
      setEnviando(false);
      setError(resultado.error);
      return;
    }
    router.push(`/grupos/${resultado.datos.grupo.id}`);
  }

  return (
    <form onSubmit={enviar} className="space-y-5">
      <Campo
        id="nombre"
        name="nombre"
        etiqueta="Nombre del grupo"
        placeholder="Los de siempre"
        maxLength={40}
        required
      />
      <MensajeDeError mensaje={error} />
      <Button type="submit" size="lg" className="w-full" disabled={enviando}>
        {enviando ? "Creando…" : "Crear grupo"}
      </Button>
    </form>
  );
}
