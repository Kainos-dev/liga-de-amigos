import type { ReactNode } from "react";
import { Avatar } from "@/components/avatar";
import type { Destacado } from "@/server/domain/resumenes";
import type { Personas } from "@/server/services/resumenes";

/** "Ana", "Ana y Beto", "Ana, Beto y Caro" */
export function listaDeNombres(ids: string[], personas: Personas): string {
  const nombres = ids.map((id) => personas[id]?.nombre ?? "Alguien");
  if (nombres.length <= 1) return nombres.join("");
  return `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
}

/**
 * Tarjeta de un destacado. Si no hay destacado (null), no se muestra nada:
 * no inventamos ganadores.
 */
export function TarjetaDestacado({
  titulo,
  destacado,
  personas,
  detalle,
  tono = "positivo",
}: {
  titulo: string;
  destacado: Destacado | null;
  personas: Personas;
  detalle: (valor: number) => ReactNode;
  tono?: "positivo" | "negativo";
}) {
  if (!destacado) return null;
  const empate = destacado.integranteIds.length > 1;

  return (
    <div className="space-y-3 rounded-xl bg-card p-4">
      <p className="text-sm text-muted-foreground">{titulo}</p>
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          {destacado.integranteIds.slice(0, 4).map((id) => (
            <span key={id} className="rounded-full ring-2 ring-card">
              <Avatar
                nombre={personas[id]?.nombre ?? "?"}
                fotoUrl={personas[id]?.fotoUrl ?? null}
                tamano="mediano"
              />
            </span>
          ))}
        </div>
        <div className="min-w-0">
          <p className="font-heading text-lg leading-tight font-semibold">
            {listaDeNombres(destacado.integranteIds, personas)}
          </p>
          <p className={`text-sm ${tono === "negativo" ? "text-naranja" : "text-amarillo"}`}>
            {detalle(destacado.valor)}
            {empate && <span className="text-muted-foreground"> · empate</span>}
          </p>
        </div>
      </div>
    </div>
  );
}

export function DatoGrande({ titulo, valor }: { titulo: string; valor: ReactNode }) {
  return (
    <div className="rounded-xl bg-card p-4">
      <p className="text-sm text-muted-foreground">{titulo}</p>
      <p className="font-heading text-3xl font-bold tabular-nums">{valor}</p>
    </div>
  );
}

export const plural = (n: number, singular: string, varios: string) =>
  `${n} ${n === 1 ? singular : varios}`;
