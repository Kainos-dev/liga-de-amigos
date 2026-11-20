"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Campo, MensajeDeError } from "@/components/campo";
import { SelectorDeFoto } from "@/components/selector-de-foto";
import { Button } from "@/components/ui/button";
import { llamarApi, subirFoto } from "@/lib/api-cliente";

export function FormularioCrearCuenta() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  // La foto elegida (ya achicada) y una dirección temporal para verla antes de subirla.
  const [foto, setFoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function cambiarFoto(blob: Blob | null) {
    if (foto) URL.revokeObjectURL(foto.url); // liberamos la vista previa anterior
    setFoto(blob ? { blob, url: URL.createObjectURL(blob) } : null);
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);

    if (datos.get("pin") !== datos.get("pinRepetido")) {
      setError("Los PIN no coinciden");
      return;
    }

    setEnviando(true);
    setError(null);
    const resultado = await llamarApi("POST", "/cuentas", {
      nombre,
      usuario: datos.get("usuario"),
      pin: datos.get("pin"),
    });

    if (!resultado.ok) {
      setEnviando(false);
      setError(resultado.error);
      return;
    }

    // La cuenta ya existe y la sesión quedó abierta: ahora la foto, si eligió una.
    // Si la foto falla, la cuenta igual queda creada y se puede subir desde "Mi cuenta".
    if (foto) {
      const subida = await subirFoto(foto.blob);
      if (!subida.ok) {
        router.push("/cuenta");
        router.refresh();
        return;
      }
    }
    router.push("/");
    router.refresh(); // para que el inicio lea la sesión nueva
  }

  return (
    <form onSubmit={enviar} className="space-y-6">
      <Campo
        id="nombre"
        etiqueta="Nombre o apodo"
        maxLength={30}
        required
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Tomi"
      />

      {/* Vista previa de cómo te van a ver los demás */}
      <div className="space-y-2 rounded-xl bg-card p-4">
        <p className="text-sm font-medium">Foto de perfil (opcional)</p>
        <SelectorDeFoto
          nombre={nombre}
          fotoUrl={foto?.url ?? null}
          ocupado={enviando}
          alElegir={cambiarFoto}
          alQuitar={() => cambiarFoto(null)}
        />
        <p className="text-xs text-muted-foreground">
          Sin foto se muestra la inicial de tu nombre. La podés cambiar cuando quieras.
        </p>
      </div>

      <Campo
        id="usuario"
        name="usuario"
        etiqueta="Usuario para entrar"
        ayuda="Letras, números, punto o guion bajo. Lo vas a usar para entrar desde otro celular."
        autoComplete="username"
        autoCapitalize="none"
        minLength={3}
        maxLength={20}
        required
        placeholder="tomi_el_tano"
      />
      <Campo
        id="pin"
        name="pin"
        type="password"
        etiqueta="PIN"
        ayuda="Al menos 6 caracteres. Pueden ser números o letras."
        autoComplete="new-password"
        minLength={6}
        required
      />
      <Campo
        id="pinRepetido"
        name="pinRepetido"
        type="password"
        etiqueta="Repetí el PIN"
        autoComplete="new-password"
        minLength={6}
        required
      />

      <p className="text-sm text-muted-foreground">
        Ojo: el nombre no se puede cambiar después.
      </p>

      <MensajeDeError mensaje={error} />

      <Button type="submit" size="lg" className="w-full" disabled={enviando}>
        {enviando ? "Creando cuenta…" : "Crear cuenta"}
      </Button>
    </form>
  );
}
