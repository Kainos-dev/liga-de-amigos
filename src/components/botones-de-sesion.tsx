"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Campo, MensajeDeError } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { llamarApi } from "@/lib/api-cliente";

export function BotonCerrarSesion() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);

  async function cerrar() {
    setEnviando(true);
    await llamarApi("DELETE", "/sesiones");
    router.push("/");
    router.refresh();
  }

  return (
    <Button variant="secondary" size="lg" onClick={cerrar} disabled={enviando}>
      Cerrar sesión
    </Button>
  );
}

/** Eliminar la cuenta: se despliega y pide el PIN para confirmar. */
export function EliminarCuenta() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function eliminar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const pin = new FormData(evento.currentTarget).get("pin");

    setEnviando(true);
    setError(null);
    const resultado = await llamarApi("DELETE", "/cuentas/yo", { pin });
    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    router.push("/");
    router.refresh();
  }

  if (!abierto) {
    return (
      <Button variant="destructive" onClick={() => setAbierto(true)}>
        Eliminar mi cuenta
      </Button>
    );
  }

  return (
    <form onSubmit={eliminar} className="space-y-4 rounded-xl border border-destructive/40 p-4">
      <p className="text-sm">
        Se borra tu cuenta y no se puede deshacer. En tus grupos vas a seguir apareciendo
        con tu historial y tus puntos, pero sin cuenta.
      </p>
      <Campo
        id="pin-eliminar"
        name="pin"
        type="password"
        etiqueta="Tu PIN para confirmar"
        autoComplete="current-password"
        required
      />
      <MensajeDeError mensaje={error} />
      <div className="flex gap-3">
        <Button type="submit" variant="destructive" disabled={enviando}>
          {enviando ? "Eliminando…" : "Sí, eliminar"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
