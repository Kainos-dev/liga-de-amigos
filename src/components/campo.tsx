import type { ComponentProps } from "react";

/** Etiqueta + input con los estilos de la app. */
export function Campo({
  etiqueta,
  ayuda,
  id,
  ...props
}: ComponentProps<"input"> & { etiqueta: string; ayuda?: string; id: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {etiqueta}
      </label>
      <input
        id={id}
        className="h-11 w-full rounded-lg border border-input bg-input/30 px-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        {...props}
      />
      {ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}
    </div>
  );
}

export function MensajeDeError({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null;
  return (
    <p role="alert" className="rounded-lg bg-destructive/15 px-3 py-2 text-sm text-destructive">
      {mensaje}
    </p>
  );
}
