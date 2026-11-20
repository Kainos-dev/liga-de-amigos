"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MensajeDeError } from "@/components/campo";
import { SelectorDeFoto } from "@/components/selector-de-foto";
import { llamarApi, subirFoto } from "@/lib/api-cliente";

/** En "Mi cuenta": cambiar o sacar la foto. Se guarda apenas se elige. */
export function CambiarFoto({ nombre, fotoUrl }: { nombre: string; fotoUrl: string | null }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(accion: () => Promise<{ ok: boolean; error?: string }>) {
    setEnviando(true);
    setError(null);
    const resultado = await accion();
    setEnviando(false);
    if (!resultado.ok) return setError(resultado.error ?? "Algo salió mal");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <SelectorDeFoto
        nombre={nombre}
        fotoUrl={fotoUrl}
        ocupado={enviando}
        alElegir={(foto) => guardar(() => subirFoto(foto))}
        alQuitar={() => guardar(() => llamarApi("DELETE", "/cuentas/yo/foto"))}
      />
      {enviando && <p className="text-sm text-muted-foreground">Guardando…</p>}
      <MensajeDeError mensaje={error} />
    </div>
  );
}
