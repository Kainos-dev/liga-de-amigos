"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { MensajeDeError } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { llamarApi } from "@/lib/api-cliente";
import { conSigno } from "@/lib/fechas";

const PUNTOS_MINIMOS = -50;
const PUNTOS_MAXIMOS = 50;

const estiloInput =
  "h-10 min-w-0 flex-1 rounded-lg border border-input bg-input/30 px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** Selector de puntos con botones − y + (cómodo en el celular). */
function SelectorDePuntos({ valor, cambiar }: { valor: number; cambiar: (n: number) => void }) {
  const ajustar = (delta: number) =>
    cambiar(Math.min(PUNTOS_MAXIMOS, Math.max(PUNTOS_MINIMOS, valor + delta)));

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="secondary" size="icon" onClick={() => ajustar(-1)} aria-label="Restar un punto">
        −
      </Button>
      <span
        className={`font-heading w-12 text-center text-xl font-bold tabular-nums ${valor < 0 ? "text-naranja" : "text-amarillo"}`}
        aria-live="polite"
      >
        {conSigno(valor)}
      </span>
      <Button type="button" variant="secondary" size="icon" onClick={() => ajustar(1)} aria-label="Sumar un punto">
        +
      </Button>
    </div>
  );
}

function useEnvio() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(metodo: "POST" | "PATCH", ruta: string, cuerpo: unknown) {
    setEnviando(true);
    setError(null);
    const resultado = await llamarApi(metodo, ruta, cuerpo);
    setEnviando(false);
    if (!resultado.ok) {
      setError(resultado.error);
      return false;
    }
    router.refresh();
    return true;
  }

  return { enviando, error, enviar };
}

export function EditarAccion({
  grupoId,
  accion,
}: {
  grupoId: string;
  accion: { id: string; nombre: string; puntosHoy: number; clave: string | null; archivada: boolean };
}) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState(accion.nombre);
  const [puntos, setPuntos] = useState(accion.puntosHoy);
  const { enviando, error, enviar } = useEnvio();
  const ruta = `/grupos/${grupoId}/acciones/${accion.id}`;

  if (!abierto) {
    return (
      <div className="flex gap-1">
        {!accion.archivada && (
          <Button variant="ghost" size="sm" onClick={() => setAbierto(true)}>
            Editar
          </Button>
        )}
        {!accion.clave && (
          <Button
            variant="ghost"
            size="sm"
            disabled={enviando}
            onClick={() => enviar("PATCH", ruta, { archivada: !accion.archivada })}
          >
            {accion.archivada ? "Reactivar" : "Archivar"}
          </Button>
        )}
        <MensajeDeError mensaje={error} />
      </div>
    );
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const cambios: { nombre?: string; puntos?: number } = {};
    if (nombre.trim() !== accion.nombre) cambios.nombre = nombre;
    if (puntos !== accion.puntosHoy) cambios.puntos = puntos;
    if (Object.keys(cambios).length === 0) return setAbierto(false);
    if (await enviar("PATCH", ruta, cambios)) setAbierto(false);
  }

  return (
    <form onSubmit={guardar} className="w-full space-y-3 pt-2">
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        maxLength={40}
        required
        aria-label="Nombre de la acción"
        className={`${estiloInput} w-full`}
      />
      <SelectorDePuntos valor={puntos} cambiar={setPuntos} />
      {puntos !== accion.puntosHoy && (
        <p className="text-xs text-muted-foreground">
          El valor nuevo rige desde hoy. Lo que ya se cargó antes conserva {conSigno(accion.puntosHoy)}.
        </p>
      )}
      <MensajeDeError mensaje={error} />
      <div className="flex gap-2">
        <Button type="submit" disabled={enviando}>
          Guardar
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setNombre(accion.nombre);
            setPuntos(accion.puntosHoy);
            setAbierto(false);
          }}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function NuevaAccion({ grupoId }: { grupoId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [puntos, setPuntos] = useState(1);
  const { enviando, error, enviar } = useEnvio();

  if (!abierto) {
    return (
      <Button size="lg" className="w-full" onClick={() => setAbierto(true)}>
        Agregar acción
      </Button>
    );
  }

  async function crear(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (await enviar("POST", `/grupos/${grupoId}/acciones`, { nombre, puntos })) {
      setNombre("");
      setPuntos(1);
      setAbierto(false);
    }
  }

  return (
    <form onSubmit={crear} className="space-y-3 rounded-xl bg-card p-4">
      <h3 className="font-heading font-semibold">Nueva acción</h3>
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Se acordó del cumpleaños"
        maxLength={40}
        required
        aria-label="Nombre de la acción"
        className={`${estiloInput} w-full`}
      />
      <SelectorDePuntos valor={puntos} cambiar={setPuntos} />
      <p className="text-xs text-muted-foreground">
        Puede sumar o restar (de {PUNTOS_MINIMOS} a +{PUNTOS_MAXIMOS}).
      </p>
      <MensajeDeError mensaje={error} />
      <div className="flex gap-2">
        <Button type="submit" disabled={enviando}>
          Crear
        </Button>
        <Button type="button" variant="ghost" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
