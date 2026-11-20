"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Campo, MensajeDeError } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { llamarApi } from "@/lib/api-cliente";
import { conSigno } from "@/lib/fechas";

const estiloSelect =
  "h-11 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function FormularioAccionSuelta({
  grupoId,
  integrantes,
  acciones,
  hoy,
}: {
  grupoId: string;
  integrantes: { id: string; nombre: string }[];
  acciones: { id: string; nombre: string; puntosHoy: number }[];
  hoy: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const datos = new FormData(formulario);

    setEnviando(true);
    setError(null);
    setListo(false);
    const resultado = await llamarApi("POST", `/grupos/${grupoId}/acciones-sueltas`, {
      fecha: datos.get("fecha"),
      integranteId: datos.get("integranteId"),
      accionId: datos.get("accionId"),
      nota: datos.get("nota"),
    });
    setEnviando(false);

    if (!resultado.ok) return setError(resultado.error);
    formulario.reset();
    setListo(true);
    router.refresh();
  }

  return (
    <form onSubmit={enviar} className="space-y-4 rounded-xl bg-card p-4">
      <label className="block space-y-1.5">
        <span className="block text-sm font-medium">¿A quién?</span>
        <select name="integranteId" required defaultValue="" className={estiloSelect}>
          <option value="" disabled>
            Elegí a alguien
          </option>
          {integrantes.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1.5">
        <span className="block text-sm font-medium">¿Qué hizo?</span>
        <select name="accionId" required defaultValue="" className={estiloSelect}>
          <option value="" disabled>
            Elegí una acción
          </option>
          {acciones.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre} ({conSigno(a.puntosHoy)})
            </option>
          ))}
        </select>
      </label>
      <Campo id="fecha" name="fecha" type="date" etiqueta="Fecha" defaultValue={hoy} max={hoy} required />
      <Campo
        id="nota"
        name="nota"
        etiqueta="Nota (opcional)"
        placeholder="Se acordó del cumple de Juli"
        maxLength={200}
      />
      <MensajeDeError mensaje={error} />
      {listo && <p className="text-sm text-amarillo">¡Listo! Ya se cargaron los puntos.</p>}
      <Button type="submit" size="lg" className="w-full" disabled={enviando}>
        {enviando ? "Cargando…" : "Cargar puntos"}
      </Button>
    </form>
  );
}

export function BorrarAccionSuelta({ grupoId, sueltaId }: { grupoId: string; sueltaId: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function borrar() {
    setEnviando(true);
    setError(null);
    const resultado = await llamarApi("DELETE", `/grupos/${grupoId}/acciones-sueltas/${sueltaId}`);
    setEnviando(false);
    if (!resultado.ok) return setError(resultado.error);
    router.refresh();
  }

  return (
    <div>
      <Button variant="ghost" size="sm" disabled={enviando} onClick={borrar}>
        Borrar
      </Button>
      <MensajeDeError mensaje={error} />
    </div>
  );
}
