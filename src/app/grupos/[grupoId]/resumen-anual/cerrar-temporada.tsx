"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MensajeDeError } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { llamarApi } from "@/lib/api-cliente";

export function CerrarTemporada({ grupoId, anio }: { grupoId: string; anio: number }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cerrar() {
    setEnviando(true);
    setError(null);
    const resultado = await llamarApi("POST", `/grupos/${grupoId}/temporadas/${anio}/cerrar`);
    setEnviando(false);
    if (!resultado.ok) return setError(resultado.error);
    router.refresh();
  }

  if (!confirmando) {
    return (
      <Button size="lg" className="w-full" onClick={() => setConfirmando(true)}>
        Cerrar la temporada {anio}
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-amarillo/50 p-4">
      <p className="text-sm">
        Se guarda la tabla final y este resumen tal como están, y ya no se pueden cargar ni
        editar juntadas ni puntos de {anio}. No se puede deshacer.
      </p>
      <div className="flex gap-2">
        <Button disabled={enviando} onClick={cerrar}>
          {enviando ? "Cerrando…" : "Sí, cerrar"}
        </Button>
        <Button variant="ghost" onClick={() => setConfirmando(false)}>
          Cancelar
        </Button>
      </div>
      <MensajeDeError mensaje={error} />
    </div>
  );
}
