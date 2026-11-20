import { Suspense } from "react";
import { BarraInferior } from "./barra-inferior";

/**
 * Todo lo que está dentro de un grupo lleva la barra inferior.
 * La barra lee la URL (qué grupo y qué sección), que es un dato de cada
 * pedido: por eso va dentro de un Suspense y el resto de la página se puede
 * generar de antemano (cacheComponents).
 */
export default function LayoutDelGrupo({ children }: LayoutProps<"/grupos/[grupoId]">) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <BarraInferior />
      </Suspense>
    </>
  );
}
