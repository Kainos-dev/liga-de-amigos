import Link from "next/link";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { fechaCorta } from "@/lib/fechas";
import { listarJuntadas } from "@/server/services/juntadas";
import { listarSolicitudes } from "@/server/services/solicitudes";
import { accederAlGrupo, CLASE_PAGINA, SinAcceso, Volver } from "./acceso";

export default function PaginaGrupo({ params }: PageProps<"/grupos/[grupoId]">) {
  return (
    <main className={CLASE_PAGINA}>
      <Volver href="/" texto="Mis grupos" />
      {/* params y la sesión son datos de cada petición: van dentro de un Suspense. */}
      <Suspense fallback={<p className="text-muted-foreground">Cargando grupo…</p>}>
        <ContenidoDelGrupo params={params} />
      </Suspense>
    </main>
  );
}

async function ContenidoDelGrupo({ params }: { params: Promise<{ grupoId: string }> }) {
  const acceso = await accederAlGrupo((await params).grupoId);
  if (!acceso) return <SinAcceso />;
  const { usuario, grupo } = acceso;

  const esAdmin = grupo.miRol === "admin";
  const [juntadas, solicitudes] = await Promise.all([
    listarJuntadas(usuario.id, grupo.id, 20),
    esAdmin ? listarSolicitudes(usuario.id, grupo.id) : Promise.resolve([]),
  ]);
  const base = `/grupos/${grupo.id}`;

  return (
    <div className="space-y-8">
      <h1 className="font-display text-5xl leading-none tracking-wide break-words">
        {grupo.nombre}
      </h1>

      {solicitudes.length > 0 && (
        <Link
          href={`${base}/integrantes`}
          className="block rounded-xl bg-amarillo p-4 font-medium text-violeta-oscuro"
        >
          {solicitudes.length === 1
            ? "1 persona quiere entrar al grupo →"
            : `${solicitudes.length} personas quieren entrar al grupo →`}
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link href={`${base}/juntadas/nueva`} className={buttonVariants({ size: "lg" })}>
          Registrar juntada
        </Link>
        <Link
          href={`${base}/puntos-sueltos`}
          className={buttonVariants({ size: "lg", variant: "secondary" })}
        >
          Puntos sueltos
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">Últimas juntadas</h2>
        {juntadas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay juntadas. Registrá la primera y empiezan a sumar puntos.
          </p>
        ) : (
          <ul className="space-y-2">
            {juntadas.map((juntada) => (
              <li key={juntada.id}>
                <Link
                  href={`${base}/juntadas/${juntada.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl bg-card p-4 hover:bg-muted"
                >
                  <div className="min-w-0">
                    <p className="font-heading truncate font-semibold">
                      {juntada.titulo ?? "Juntada"}
                    </p>
                    <p className="text-sm text-muted-foreground first-letter:uppercase">
                      {fechaCorta(juntada.fecha)} · {juntada.asistentes}{" "}
                      {juntada.asistentes === 1 ? "fue" : "fueron"}
                    </p>
                  </div>
                  {juntada.cancelada && (
                    <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                      Cancelada
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        href={`${base}/integrantes`}
        className="flex items-center justify-between rounded-xl border border-border p-4 hover:bg-muted"
      >
        <span>
          <span className="font-heading font-semibold">Integrantes y código</span>
          <span className="block text-sm text-muted-foreground">
            {grupo.integrantes.length}{" "}
            {grupo.integrantes.length === 1 ? "integrante" : "integrantes"} · Código {grupo.codigo}
          </span>
        </span>
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
