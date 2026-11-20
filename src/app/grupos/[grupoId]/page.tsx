import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { buttonVariants } from "@/components/ui/button";
import { ErrorSinPermiso } from "@/server/domain/errores";
import { esIdValido } from "@/server/api";
import { type DetalleDeGrupo, obtenerGrupo } from "@/server/services/grupos";
import { listarSolicitudes } from "@/server/services/solicitudes";
import { usuarioActual } from "@/server/sesion";
import {
  AccionesDeIntegrante,
  AgregarSinCuenta,
  CodigoDelGrupo,
  RenombrarGrupo,
  ResponderSolicitud,
} from "./controles";

export default function PaginaGrupo({ params }: PageProps<"/grupos/[grupoId]">) {
  return (
    <main className="mx-auto w-full max-w-md space-y-8 px-4 py-10">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Mis grupos
      </Link>
      {/* params y la sesión son datos de cada petición: van dentro de un Suspense. */}
      <Suspense fallback={<p className="text-muted-foreground">Cargando grupo…</p>}>
        <ContenidoDelGrupo params={params} />
      </Suspense>
    </main>
  );
}

async function ContenidoDelGrupo({ params }: { params: Promise<{ grupoId: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/entrar");

  const { grupoId } = await params;
  // Un id mal formado se trata igual que un grupo ajeno.
  if (!esIdValido(grupoId)) return <SinAcceso />;

  let grupo: DetalleDeGrupo;
  try {
    grupo = await obtenerGrupo(usuario.id, grupoId);
  } catch (error) {
    if (error instanceof ErrorSinPermiso) return <SinAcceso />;
    throw error;
  }

  const esAdmin = grupo.miRol === "admin";
  const solicitudes = esAdmin ? await listarSolicitudes(usuario.id, grupo.id) : [];
  const perfilesSinCuenta = grupo.integrantes
    .filter((i) => !i.tieneCuenta)
    .map((i) => ({ id: i.id, nombre: i.nombre }));

  return (
    <div className="space-y-8">
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
                  <Avatar emoji={solicitud.avatarEmoji} color={solicitud.avatarColor} />
                  <div className="min-w-0">
                    <p className="font-heading truncate font-semibold">{solicitud.nombre}</p>
                    <p className="text-sm text-muted-foreground">@{solicitud.usuario}</p>
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
              <li key={integrante.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-card p-3">
                {integrante.avatarEmoji && integrante.avatarColor ? (
                  <Avatar emoji={integrante.avatarEmoji} color={integrante.avatarColor} tamano="chico" />
                ) : (
                  // Sin cuenta: inicial del nombre en un círculo neutro.
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted font-heading font-semibold text-muted-foreground">
                    {integrante.nombre.charAt(0).toUpperCase()}
                  </span>
                )}
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

function SinAcceso() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl tracking-wide">Sin acceso</h1>
      <p className="text-muted-foreground">
        No sos parte de este grupo. Si te pasaron el código, pedí entrar y esperá que te acepten.
      </p>
      <Link href="/unirme" className={buttonVariants({ size: "lg" })}>
        Unirme con código
      </Link>
    </div>
  );
}
