"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MensajeDeError } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { llamarApi } from "@/lib/api-cliente";

/** Cancelar / reactivar y eliminar una juntada. */
export function ControlesDeJuntada({
  grupoId,
  juntadaId,
  cancelada,
}: {
  grupoId: string;
  juntadaId: string;
  cancelada: boolean;
}) {
  const router = useRouter();
  const [confirmandoBorrar, setConfirmandoBorrar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ruta = `/grupos/${grupoId}/juntadas/${juntadaId}`;

  async function cambiarCancelacion() {
    setEnviando(true);
    setError(null);
    const resultado = await llamarApi("PATCH", ruta, { cancelada: !cancelada });
    setEnviando(false);
    if (!resultado.ok) return setError(resultado.error);
    router.refresh();
  }

  async function borrar() {
    setEnviando(true);
    setError(null);
    const resultado = await llamarApi("DELETE", ruta);
    if (!resultado.ok) {
      setEnviando(false);
      return setError(resultado.error);
    }
    router.push(`/grupos/${grupoId}`);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={enviando} onClick={cambiarCancelacion}>
          {cancelada ? "Reactivar juntada" : "Marcar como cancelada"}
        </Button>
        {!confirmandoBorrar && (
          <Button variant="ghost" onClick={() => setConfirmandoBorrar(true)}>
            Eliminar
          </Button>
        )}
      </div>
      {!cancelada && (
        <p className="text-xs text-muted-foreground">
          Una juntada cancelada queda en el historial pero no suma ni resta puntos.
        </p>
      )}
      {confirmandoBorrar && (
        <div className="space-y-2 rounded-xl border border-destructive/40 p-4">
          <p className="text-sm">
            Se borra la juntada con su asistencia y sus puntos. No se puede deshacer.
          </p>
          <div className="flex gap-2">
            <Button variant="destructive" disabled={enviando} onClick={borrar}>
              Sí, eliminar
            </Button>
            <Button variant="ghost" onClick={() => setConfirmandoBorrar(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
      <MensajeDeError mensaje={error} />
    </div>
  );
}
