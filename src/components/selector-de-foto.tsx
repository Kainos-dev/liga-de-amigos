"use client";

import { useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { MensajeDeError } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { achicarImagen } from "@/lib/achicar-imagen";

/**
 * Avatar grande con botones para elegir o sacar la foto. No sube nada: avisa
 * con la foto ya achicada (o null si la sacan) y quien lo usa decide qué hacer.
 */
export function SelectorDeFoto({
  nombre,
  fotoUrl,
  ocupado = false,
  alElegir,
  alQuitar,
}: {
  nombre: string;
  fotoUrl: string | null;
  ocupado?: boolean;
  alElegir: (foto: Blob) => void;
  alQuitar: () => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  async function elegido(archivo: File | undefined) {
    if (!archivo) return;
    setError(null);
    setProcesando(true);
    try {
      alElegir(await achicarImagen(archivo));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos usar esa imagen");
    } finally {
      setProcesando(false);
      // Permite volver a elegir el mismo archivo si hace falta.
      if (entrada.current) entrada.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <Avatar nombre={nombre.trim() || "?"} fotoUrl={fotoUrl} tamano="grande" />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={procesando || ocupado}
            onClick={() => entrada.current?.click()}
          >
            {procesando ? "Preparando…" : fotoUrl ? "Cambiar foto" : "Elegir foto"}
          </Button>
          {fotoUrl && (
            <Button type="button" variant="ghost" disabled={ocupado} onClick={alQuitar}>
              Sacar foto
            </Button>
          )}
        </div>
      </div>
      <input
        ref={entrada}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => elegido(e.target.files?.[0])}
      />
      <MensajeDeError mensaje={error} />
    </div>
  );
}
