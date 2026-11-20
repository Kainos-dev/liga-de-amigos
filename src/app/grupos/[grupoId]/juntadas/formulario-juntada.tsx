"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { AvatarDeIntegrante } from "@/components/avatar";
import { Campo, MensajeDeError } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { llamarApi } from "@/lib/api-cliente";
import { conSigno } from "@/lib/fechas";
// El motor de puntos es código puro (no toca la base), así que se puede usar
// también en el navegador para mostrar el resumen antes de guardar. Igual el
// servidor vuelve a calcular todo: lo de acá es solo una vista previa.
import type { Accion } from "@/server/domain/acciones";
import { calcularPuntosDeJuntada, type EstadoDeParticipacion } from "@/server/domain/puntos";

type Integrante = {
  id: string;
  nombre: string;
  avatarEmoji: string | null;
  avatarColor: string | null;
};

type AccionDelFormulario = Accion & { puntosHoy: number };

export type JuntadaInicial = {
  id: string;
  fecha: string;
  titulo: string | null;
  notas: string | null;
  invitadosExternos: string | null;
  participaciones: { integranteId: string; estado: EstadoDeParticipacion }[];
  acciones: { integranteId: string; accionId: string }[];
};

const OPCIONES_DE_ESTADO: { estado: EstadoDeParticipacion; texto: string }[] = [
  { estado: "asistio", texto: "Fue" },
  { estado: "ausente_confirmado", texto: "Faltó" },
  { estado: "no_invitado", texto: "No invitado" },
];

const llave = (integranteId: string, accionId: string) => `${integranteId}|${accionId}`;

export function FormularioJuntada({
  grupoId,
  integrantes,
  acciones,
  hoy,
  inicial,
}: {
  grupoId: string;
  integrantes: Integrante[];
  acciones: AccionDelFormulario[];
  hoy: string;
  inicial?: JuntadaInicial;
}) {
  const router = useRouter();
  const [fecha, setFecha] = useState(inicial?.fecha ?? hoy);
  const [estados, setEstados] = useState<Record<string, EstadoDeParticipacion>>(() =>
    Object.fromEntries((inicial?.participaciones ?? []).map((p) => [p.integranteId, p.estado])),
  );
  const [marcadas, setMarcadas] = useState<Set<string>>(
    () => new Set((inicial?.acciones ?? []).map((a) => llave(a.integranteId, a.accionId))),
  );
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Asistir y Faltar se aplican solos; acá se muestran las que se marcan a mano.
  const accionesManuales = acciones.filter((a) => !a.clave);
  const positivas = accionesManuales.filter((a) => a.puntosHoy >= 0);
  const negativas = accionesManuales.filter((a) => a.puntosHoy < 0);

  function elegirEstado(integranteId: string, estado: EstadoDeParticipacion) {
    setEstados((actuales) => {
      const nuevos = { ...actuales };
      // Tocar el que ya estaba elegido lo deja "sin dato".
      if (nuevos[integranteId] === estado) delete nuevos[integranteId];
      else nuevos[integranteId] = estado;
      return nuevos;
    });
  }

  function marcarTodosFueron() {
    setEstados(Object.fromEntries(integrantes.map((i) => [i.id, "asistio" as const])));
  }

  function alternar(integranteId: string, accionId: string) {
    setMarcadas((actuales) => {
      const nuevas = new Set(actuales);
      const clave = llave(integranteId, accionId);
      if (nuevas.has(clave)) nuevas.delete(clave);
      else nuevas.add(clave);
      return nuevas;
    });
  }

  const participaciones = Object.entries(estados).map(([integranteId, estado]) => ({
    integranteId,
    estado,
  }));
  const accionesMarcadas = [...marcadas].map((clave) => {
    const [integranteId, accionId] = clave.split("|");
    return { integranteId, accionId };
  });

  // Vista previa de puntos con el mismo motor que usa el servidor.
  // Es un cálculo chico: se rehace en cada render sin problema.
  const resumen = calcularResumen();

  function calcularResumen() {
    try {
      const registros = calcularPuntosDeJuntada(
        { fecha, participaciones, accionesMarcadas },
        acciones,
      );
      const totales = new Map<string, number>();
      for (const r of registros) {
        totales.set(r.integranteId, (totales.get(r.integranteId) ?? 0) + r.puntos);
      }
      return integrantes
        .filter((i) => totales.has(i.id))
        .map((i) => ({ ...i, puntos: totales.get(i.id)! }))
        .sort((a, b) => b.puntos - a.puntos);
    } catch {
      return [];
    }
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    const cuerpo = {
      fecha,
      titulo: datos.get("titulo"),
      notas: datos.get("notas"),
      invitadosExternos: datos.get("invitadosExternos"),
      participaciones,
      acciones: accionesMarcadas,
    };

    setEnviando(true);
    setError(null);
    const resultado = inicial
      ? await llamarApi("PUT", `/grupos/${grupoId}/juntadas/${inicial.id}`, cuerpo)
      : await llamarApi<{ juntada: { id: string } }>("POST", `/grupos/${grupoId}/juntadas`, cuerpo);

    if (!resultado.ok) {
      setEnviando(false);
      setError(resultado.error);
      return;
    }
    const juntadaId = inicial?.id ?? (resultado.datos as { juntada: { id: string } }).juntada.id;
    router.push(`/grupos/${grupoId}/juntadas/${juntadaId}`);
    router.refresh();
  }

  return (
    <form onSubmit={enviar} className="space-y-8">
      <div className="space-y-4">
        <Campo
          id="fecha"
          type="date"
          etiqueta="Fecha"
          value={fecha}
          max={hoy}
          onChange={(e) => setFecha(e.target.value)}
          required
        />
        <Campo
          id="titulo"
          name="titulo"
          etiqueta="Título (opcional)"
          placeholder="Asado en lo de Juli"
          maxLength={60}
          defaultValue={inicial?.titulo ?? ""}
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold">¿Quién fue?</h2>
          <Button type="button" variant="ghost" size="sm" onClick={marcarTodosFueron}>
            Fueron todos
          </Button>
        </div>
        <ul className="space-y-2">
          {integrantes.map((integrante) => (
            <li key={integrante.id} className="space-y-2 rounded-xl bg-card p-3">
              <div className="flex items-center gap-3">
                <AvatarDeIntegrante
                  nombre={integrante.nombre}
                  emoji={integrante.avatarEmoji}
                  color={integrante.avatarColor}
                />
                <span className="font-heading truncate font-medium">{integrante.nombre}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5" role="group" aria-label={`Asistencia de ${integrante.nombre}`}>
                {OPCIONES_DE_ESTADO.map((opcion) => {
                  const elegido = estados[integrante.id] === opcion.estado;
                  return (
                    <button
                      key={opcion.estado}
                      type="button"
                      aria-pressed={elegido}
                      onClick={() => elegirEstado(integrante.id, opcion.estado)}
                      className={`h-9 rounded-lg text-sm font-medium transition-colors ${
                        elegido
                          ? opcion.estado === "asistio"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground ring-1 ring-foreground/30"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {opcion.texto}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Si no marcás nada, queda como &quot;sin dato&quot;: no suma ni resta.
        </p>
      </section>

      <GrupoDeAcciones
        titulo="¿Quién se lució?"
        acciones={positivas}
        integrantes={integrantes}
        marcadas={marcadas}
        alternar={alternar}
      />
      <GrupoDeAcciones
        titulo="¿Quién se mandó alguna?"
        acciones={negativas}
        integrantes={integrantes}
        marcadas={marcadas}
        alternar={alternar}
      />

      <div className="space-y-4">
        <Campo
          id="invitadosExternos"
          name="invitadosExternos"
          etiqueta="Invitados de afuera (opcional)"
          placeholder="Vinieron dos amigos de Juli"
          maxLength={200}
          defaultValue={inicial?.invitadosExternos ?? ""}
        />
        <div className="space-y-1.5">
          <label htmlFor="notas" className="block text-sm font-medium">
            Notas (opcional)
          </label>
          <textarea
            id="notas"
            name="notas"
            rows={3}
            maxLength={500}
            defaultValue={inicial?.notas ?? ""}
            className="w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
      </div>

      {resumen.length > 0 && (
        <section className="space-y-2 rounded-xl border border-border p-4">
          <h2 className="font-heading font-semibold">Así quedan los puntos</h2>
          <ul className="space-y-1">
            {resumen.map((fila) => (
              <li key={fila.id} className="flex justify-between text-sm">
                <span>{fila.nombre}</span>
                <span
                  className={`font-heading font-semibold tabular-nums ${fila.puntos < 0 ? "text-naranja" : "text-amarillo"}`}
                >
                  {conSigno(fila.puntos)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <MensajeDeError mensaje={error} />

      <Button type="submit" size="lg" className="w-full" disabled={enviando}>
        {enviando ? "Guardando…" : inicial ? "Guardar cambios" : "Registrar juntada"}
      </Button>
    </form>
  );
}

function GrupoDeAcciones({
  titulo,
  acciones,
  integrantes,
  marcadas,
  alternar,
}: {
  titulo: string;
  acciones: AccionDelFormulario[];
  integrantes: Integrante[];
  marcadas: Set<string>;
  alternar: (integranteId: string, accionId: string) => void;
}) {
  if (acciones.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="font-heading text-lg font-semibold">{titulo}</h2>
      <ul className="space-y-3">
        {acciones.map((accion) => (
          <li key={accion.id} className="space-y-2 rounded-xl bg-card p-3">
            <p className="flex justify-between gap-3">
              <span className="font-heading font-medium">{accion.nombre}</span>
              <span
                className={`font-heading font-semibold tabular-nums ${accion.puntosHoy < 0 ? "text-naranja" : "text-amarillo"}`}
              >
                {conSigno(accion.puntosHoy)}
              </span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {integrantes.map((integrante) => {
                const marcada = marcadas.has(llave(integrante.id, accion.id));
                return (
                  <button
                    key={integrante.id}
                    type="button"
                    aria-pressed={marcada}
                    onClick={() => alternar(integrante.id, accion.id)}
                    className={`h-8 rounded-full px-3 text-sm transition-colors ${
                      marcada
                        ? "bg-amarillo font-medium text-violeta-oscuro"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {integrante.nombre}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
