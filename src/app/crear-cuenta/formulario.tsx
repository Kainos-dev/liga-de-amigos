"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Avatar } from "@/components/avatar";
import { Campo, MensajeDeError } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { llamarApi } from "@/lib/api-cliente";
import {
  CLAVES_DE_COLOR,
  COLORES_DE_AVATAR,
  type ColorDeAvatar,
  EMOJIS_DE_AVATAR,
} from "@/lib/avatares";

export function FormularioCrearCuenta() {
  const router = useRouter();
  const [emoji, setEmoji] = useState<string>(EMOJIS_DE_AVATAR[0]);
  const [color, setColor] = useState<ColorDeAvatar>("naranja");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

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
      avatarEmoji: emoji,
      avatarColor: color,
    });
    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    router.push("/");
    router.refresh(); // para que el inicio lea la sesión nueva
  }

  return (
    <form onSubmit={enviar} className="space-y-6">
      {/* Vista previa de cómo te van a ver los demás */}
      <div className="flex items-center gap-4 rounded-xl bg-card p-4">
        <Avatar emoji={emoji} color={color} tamano="grande" />
        <div className="min-w-0">
          <p className="font-heading truncate text-xl font-semibold">
            {nombre.trim() || "Tu nombre"}
          </p>
          <p className="text-sm text-muted-foreground">Así te van a ver en los grupos</p>
        </div>
      </div>

      <Campo
        id="nombre"
        etiqueta="Nombre o apodo"
        maxLength={30}
        required
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Tomi"
      />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Emoji</legend>
        <div className="grid grid-cols-8 gap-1.5">
          {EMOJIS_DE_AVATAR.map((opcion) => (
            <button
              key={opcion}
              type="button"
              onClick={() => setEmoji(opcion)}
              aria-pressed={emoji === opcion}
              aria-label={`Emoji ${opcion}`}
              className="flex aspect-square items-center justify-center rounded-lg text-2xl hover:bg-muted aria-pressed:bg-muted aria-pressed:ring-2 aria-pressed:ring-amarillo"
            >
              {opcion}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Color</legend>
        <div className="flex gap-3">
          {CLAVES_DE_COLOR.map((opcion) => (
            <button
              key={opcion}
              type="button"
              onClick={() => setColor(opcion)}
              aria-pressed={color === opcion}
              aria-label={`Color ${opcion}`}
              className={`size-10 rounded-full ${COLORES_DE_AVATAR[opcion]} ring-offset-2 ring-offset-background aria-pressed:ring-2 aria-pressed:ring-amarillo`}
            />
          ))}
        </div>
      </fieldset>

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
        Ojo: el nombre, el emoji y el color no se pueden cambiar después.
      </p>

      <MensajeDeError mensaje={error} />

      <Button type="submit" size="lg" className="w-full" disabled={enviando}>
        {enviando ? "Creando cuenta…" : "Crear cuenta"}
      </Button>
    </form>
  );
}
