"use client";

/**
 * Botones y formularios de la pantalla del grupo. Cada uno llama a la API y,
 * si sale bien, refresca la página para que el servidor la vuelva a armar.
 * Los permisos se verifican en el servidor: acá solo se muestran u ocultan.
 */
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { MensajeDeError } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { llamarApi, type Resultado } from "@/lib/api-cliente";

/** Ejecuta una llamada a la API, maneja "enviando" y el error, y refresca. */
function useAccion() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ejecutar(llamada: () => Promise<Resultado<unknown>>, despues?: () => void) {
    setEnviando(true);
    setError(null);
    const resultado = await llamada();
    setEnviando(false);
    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    despues?.();
    router.refresh();
  }

  return { enviando, error, ejecutar };
}

const estiloInput =
  "h-10 min-w-0 flex-1 rounded-lg border border-input bg-input/30 px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function RenombrarGrupo({ grupoId, nombre }: { grupoId: string; nombre: string }) {
  const [editando, setEditando] = useState(false);
  const { enviando, error, ejecutar } = useAccion();

  if (!editando) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setEditando(true)}>
        Cambiar nombre
      </Button>
    );
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const nuevo = new FormData(evento.currentTarget).get("nombre");
    ejecutar(
      () => llamarApi("PATCH", `/grupos/${grupoId}`, { nombre: nuevo }),
      () => setEditando(false),
    );
  }

  return (
    <form onSubmit={enviar} className="w-full space-y-2">
      <div className="flex gap-2">
        <input
          name="nombre"
          defaultValue={nombre}
          maxLength={40}
          required
          aria-label="Nombre del grupo"
          className={estiloInput}
        />
        <Button type="submit" disabled={enviando}>
          Guardar
        </Button>
        <Button type="button" variant="ghost" onClick={() => setEditando(false)}>
          Cancelar
        </Button>
      </div>
      <MensajeDeError mensaje={error} />
    </form>
  );
}

export function CodigoDelGrupo({
  grupoId,
  codigo,
  esAdmin,
}: {
  grupoId: string;
  codigo: string;
  esAdmin: boolean;
}) {
  const [copiado, setCopiado] = useState(false);
  const { enviando, error, ejecutar } = useAccion();

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Algunos navegadores no dejan copiar: el código igual está a la vista.
    }
  }

  return (
    <div className="space-y-3 rounded-xl bg-card p-4">
      <p className="text-sm text-muted-foreground">Código para sumarse</p>
      <p className="font-heading text-4xl font-bold tracking-[0.25em] text-amarillo">{codigo}</p>
      <p className="text-sm text-muted-foreground">
        Pasáselo a tus amigos. Igual tiene que aceptarlos un administrador.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={copiar}>
          {copiado ? "¡Copiado!" : "Copiar código"}
        </Button>
        {esAdmin && (
          <Button
            variant="ghost"
            disabled={enviando}
            onClick={() => ejecutar(() => llamarApi("POST", `/grupos/${grupoId}/codigo`))}
          >
            Generar otro
          </Button>
        )}
      </div>
      <MensajeDeError mensaje={error} />
    </div>
  );
}

export function ResponderSolicitud({
  grupoId,
  solicitudId,
  perfilesSinCuenta,
}: {
  grupoId: string;
  solicitudId: string;
  perfilesSinCuenta: { id: string; nombre: string }[];
}) {
  const [perfil, setPerfil] = useState("");
  const { enviando, error, ejecutar } = useAccion();
  const ruta = `/grupos/${grupoId}/solicitudes/${solicitudId}`;

  return (
    <div className="space-y-3">
      {perfilesSinCuenta.length > 0 && (
        <label className="block space-y-1.5 text-sm">
          <span className="text-muted-foreground">¿Ya estaba cargado sin cuenta?</span>
          <select
            value={perfil}
            onChange={(e) => setPerfil(e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-card px-3 text-base"
          >
            <option value="">No, es alguien nuevo</option>
            {perfilesSinCuenta.map((p) => (
              <option key={p.id} value={p.id}>
                Sí, es {p.nombre} (se queda con su historial)
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="flex gap-2">
        <Button
          disabled={enviando}
          onClick={() =>
            ejecutar(() =>
              llamarApi("POST", `${ruta}/aceptar`, perfil ? { integranteId: perfil } : {}),
            )
          }
        >
          Aceptar
        </Button>
        <Button
          variant="ghost"
          disabled={enviando}
          onClick={() => ejecutar(() => llamarApi("POST", `${ruta}/rechazar`))}
        >
          Rechazar
        </Button>
      </div>
      <MensajeDeError mensaje={error} />
    </div>
  );
}

export function AgregarSinCuenta({ grupoId }: { grupoId: string }) {
  const [abierto, setAbierto] = useState(false);
  const { enviando, error, ejecutar } = useAccion();

  if (!abierto) {
    return (
      <Button variant="secondary" onClick={() => setAbierto(true)}>
        Agregar a alguien sin cuenta
      </Button>
    );
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const nombre = new FormData(formulario).get("nombre");
    ejecutar(
      () => llamarApi("POST", `/grupos/${grupoId}/integrantes`, { nombre }),
      () => formulario.reset(),
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-2 rounded-xl border border-border p-4">
      <p className="text-sm text-muted-foreground">
        Para anotar en las juntadas a alguien que no usa la app. Si después se crea una
        cuenta, al aceptarlo lo podés vincular a este perfil.
      </p>
      <div className="flex gap-2">
        <input
          name="nombre"
          placeholder="Nombre"
          maxLength={30}
          required
          aria-label="Nombre"
          className={estiloInput}
        />
        <Button type="submit" disabled={enviando}>
          Agregar
        </Button>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={() => setAbierto(false)}>
        Cerrar
      </Button>
      <MensajeDeError mensaje={error} />
    </form>
  );
}

/** Acciones sobre un integrante: rol y sacarlo del grupo (o salir uno mismo). */
export function AccionesDeIntegrante({
  grupoId,
  integrante,
  esAdmin,
  esUnoMismo,
}: {
  grupoId: string;
  integrante: { id: string; nombre: string; rol: "admin" | "miembro"; tieneCuenta: boolean };
  esAdmin: boolean;
  esUnoMismo: boolean;
}) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const { enviando, error, ejecutar } = useAccion();
  const ruta = `/grupos/${grupoId}/integrantes/${integrante.id}`;

  if (!esAdmin && !esUnoMismo) return null;

  if (confirmando) {
    return (
      <div className="w-full space-y-2 pt-2">
        <p className="text-sm">
          {esUnoMismo
            ? "¿Seguro que querés salir del grupo? Tu historial queda guardado."
            : `¿Sacar a ${integrante.nombre} del grupo? Su historial queda guardado.`}
        </p>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            disabled={enviando}
            onClick={() =>
              ejecutar(
                () => llamarApi("DELETE", ruta),
                // Si salí yo, ya no puedo ver el grupo: vuelvo al inicio.
                () => esUnoMismo && router.push("/"),
              )
            }
          >
            {esUnoMismo ? "Sí, salir" : "Sí, sacar"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirmando(false)}>
            Cancelar
          </Button>
        </div>
        <MensajeDeError mensaje={error} />
      </div>
    );
  }

  return (
    <div className="w-full space-y-2 pt-2">
      <div className="flex flex-wrap gap-2">
        {esAdmin && integrante.tieneCuenta && (
          <Button
            variant="ghost"
            size="sm"
            disabled={enviando}
            onClick={() =>
              ejecutar(() =>
                llamarApi("PATCH", ruta, {
                  rol: integrante.rol === "admin" ? "miembro" : "admin",
                }),
              )
            }
          >
            {integrante.rol === "admin" ? "Quitar admin" : "Hacer admin"}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => setConfirmando(true)}>
          {esUnoMismo ? "Salir del grupo" : "Sacar del grupo"}
        </Button>
      </div>
      <MensajeDeError mensaje={error} />
    </div>
  );
}
