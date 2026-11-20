import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { listarSolicitudes } from "@/server/services/solicitudes";
import { accederAlGrupo, CLASE_PAGINA, Esqueleto, SinAcceso, Volver } from "../acceso";
import {
  AccionesDeIntegrante,
  AgregarSinCuenta,
  CodigoDelGrupo,
  RenombrarGrupo,
  ResponderSolicitud,
} from "../controles";

export default function PaginaIntegrantes({ params }: PageProps<"/grupos/[grupoId]/integrantes">) {
  return (
    <main className={CLASE_PAGINA}>
      {/* params y la sesión son datos de cada petición: van dentro de un Suspense. */}
      <Suspense fallback={<Esqueleto />}>
        <Contenido params={params} />
      </Suspense>
    </main>
  );
}

async function Contenido({ params }: { params: Promise<{ grupoId: string }> }) {
  const acceso = await accederAlGrupo((await params).grupoId);
  if (!acceso) return <SinAcceso />;
  const { usuario, grupo } = acceso;

  const esAdmin = grupo.miRol === "admin";
  const solicitudes = esAdmin ? await listarSolicitudes(usuario.id, grupo.id) : [];
  const perfilesSinCuenta = grupo.integrantes
    .filter((i) => !i.tieneCuenta)
    .map((i) => ({ id: i.id, nombre: i.nombre }));

  return (
    <div className="space-y-8">
      <Volver href={`/grupos/${grupo.id}`} texto={grupo.nombre} />

      <div className="space-y-2">
        <h1 className="font-display text-5xl leading-none tracking-wide break-words">
          {grupo.nombre}
        </h1>
        {esAdmin && <RenombrarGrupo grupoId={grupo.id} nombre={grupo.nombre} />}
      </div>

      <CodigoDelGrupo grupoId={grupo.id} codigo={grupo.codigo} esAdmin={esAdmin} />

      {esAdmin && solicitudes.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold">
            Quieren entrar <span className="text-amarillo">({solicitudes.length})</span>
          </h2>
          <ul className="space-y-3">
            {solicitudes.map((solicitud) => (
              <li key={solicitud.id} className="space-y-3 rounded-xl bg-card p-4">
                <div className="flex items-center gap-3">
                  <Avatar nombre={solicitud.nombre} fotoUrl={solicitud.fotoUrl} />
                  <div className="min-w-0">
                    <p className="font-heading truncate font-semibold">{solicitud.nombre}</p>
                  </div>
                </div>
                <ResponderSolicitud
                  grupoId={grupo.id}
                  solicitudId={solicitud.id}
                  perfilesSinCuenta={perfilesSinCuenta}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">
          Integrantes <span className="text-muted-foreground">({grupo.integrantes.length})</span>
        </h2>
        <ul className="space-y-2">
          {grupo.integrantes.map((integrante) => {
            const esUnoMismo = integrante.id === grupo.miIntegranteId;
            return (
              <li
                key={integrante.id}
                className="flex flex-wrap items-center gap-3 rounded-xl bg-card p-3"
              >
                <Avatar
                  nombre={integrante.nombre}
                  fotoUrl={integrante.fotoUrl}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-heading truncate font-medium">
                    {integrante.nombre}
                    {esUnoMismo && <span className="text-muted-foreground"> (vos)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {integrante.rol === "admin" ? "Admin" : "Miembro"}
                    {!integrante.tieneCuenta && " · Sin cuenta"}
                  </p>
                </div>
                <AccionesDeIntegrante
                  grupoId={grupo.id}
                  integrante={integrante}
                  esAdmin={esAdmin}
                  esUnoMismo={esUnoMismo}
                />
              </li>
            );
          })}
        </ul>
        {esAdmin && <AgregarSinCuenta grupoId={grupo.id} />}
      </section>
    </div>
  );
}
