import { ArrowRight, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { AvataresApilados } from "@/components/avatar";
import { diaBarraMes, diaYMes } from "@/lib/fechas";
import { type ResumenDeJuntada, listarJuntadas } from "@/server/services/juntadas";
import { listarSolicitudes } from "@/server/services/solicitudes";
import { type TablaDeLaLiga, obtenerTabla } from "@/server/services/tabla";
import { accederAlGrupo, CLASE_PAGINA, Esqueleto, SinAcceso } from "./acceso";

export default function PaginaGrupo({ params }: PageProps<"/grupos/[grupoId]">) {
  return (
    <main className={CLASE_PAGINA}>
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft aria-hidden className="size-4" />
        Mis grupos
      </Link>
      {/* params y la sesión son datos de cada petición: van dentro de un Suspense. */}
      <Suspense fallback={<Esqueleto />}>
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
  const [juntadas, solicitudes, tabla] = await Promise.all([
    listarJuntadas(usuario.id, grupo.id, 10),
    esAdmin ? listarSolicitudes(usuario.id, grupo.id) : Promise.resolve([]),
    obtenerTabla(usuario.id, grupo.id),
  ]);
  const base = `/grupos/${grupo.id}`;

  return (
    <div className="space-y-8">
      <header className="aparece space-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amarillo/35 bg-amarillo/10 px-3 py-1 text-xs font-semibold tracking-widest text-amarillo uppercase">
          <span aria-hidden className="size-1.5 rounded-full bg-amarillo" />
          Temporada {tabla.anio}
        </span>
        <h1 className="titulo-sticker font-display text-6xl leading-[0.9] tracking-wide break-words">
          {grupo.nombre}
        </h1>
        <div className="flex items-center gap-3">
          <AvataresApilados personas={grupo.integrantes.map((i) => ({ nombre: i.nombre, fotoUrl: i.fotoUrl }))} maximo={6} />
          <span className="text-sm text-muted-foreground">
            {grupo.integrantes.length} {grupo.integrantes.length === 1 ? "integrante" : "integrantes"} ·{" "}
            {tabla.juntadas} {tabla.juntadas === 1 ? "juntada" : "juntadas"}
          </span>
        </div>
      </header>

      {solicitudes.length > 0 && (
        <Link
          href={`${base}/integrantes`}
          className="aparece presionable flex items-center justify-between rounded-2xl bg-amarillo p-4 font-medium text-violeta-oscuro"
        >
          {solicitudes.length === 1
            ? "1 persona quiere entrar al grupo"
            : `${solicitudes.length} personas quieren entrar al grupo`}
          <ArrowRight aria-hidden className="size-5" />
        </Link>
      )}

      <MiPosicion tabla={tabla} base={base} />

      <div className="aparece flex flex-wrap gap-2" style={{ animationDelay: "0.12s" }}>
        <Link href={`${base}/puntos-sueltos`} className="presionable rounded-full bg-card px-4 py-2 text-sm font-medium relieve hover:bg-muted">
          Cargar puntos sueltos
        </Link>
        <Link href={`${base}/reglas`} className="presionable rounded-full bg-card px-4 py-2 text-sm font-medium relieve hover:bg-muted">
          Reglas y puntos
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="aparece font-heading text-xl font-bold" style={{ animationDelay: "0.16s" }}>
          Últimas juntadas
        </h2>
        {juntadas.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Todavía no hay juntadas. Tocá el botón naranja de abajo para registrar la primera.
          </p>
        ) : (
          <ul className="space-y-3.5">
            {juntadas.map((juntada, i) => (
              <li key={juntada.id} className="aparece" style={{ animationDelay: `${0.2 + i * 0.07}s` }}>
                <Ticket juntada={juntada} href={`${base}/juntadas/${juntada.id}`} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        href={`${base}/resumen-anual`}
        className="aparece presionable relative flex items-center gap-4 overflow-hidden rounded-3xl bg-amarillo p-5 text-violeta-oscuro"
        style={{ animationDelay: "0.4s" }}
      >
        <span aria-hidden className="trama-naranja absolute inset-0 [mask-image:linear-gradient(100deg,transparent_40%,#000)]" />
        <span className="relative flex-1">
          <span className="block font-display text-3xl leading-none tracking-wide">Tu año en la liga</span>
          <span className="mt-1.5 block text-sm font-medium">Los destacados, el desastre y todo lo que pasó</span>
        </span>
        <span className="relative flex size-11 items-center justify-center rounded-full bg-violeta-oscuro text-amarillo">
          <ArrowRight aria-hidden className="size-5" />
        </span>
      </Link>
    </div>
  );
}

/** "Tu posición": el número grande, los puntos y cuánto falta para el primero. */
function MiPosicion({ tabla, base }: { tabla: TablaDeLaLiga; base: string }) {
  const miFila = tabla.filas.find((f) => f.integranteId === tabla.miIntegranteId);
  const hayPuntos = tabla.filas.some((f) => f.puntos !== 0);
  const lider = tabla.filas[0];

  if (!miFila || !hayPuntos) {
    return (
      <div className="aparece relative overflow-hidden rounded-3xl bg-card p-5 relieve" style={{ animationDelay: "0.08s" }}>
        <p className="font-heading text-lg font-semibold">La tabla está en cero</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Cuando registren la primera juntada, acá vas a ver tu posición.
        </p>
      </div>
    );
  }

  const progreso = lider.puntos > 0 ? Math.max(0, Math.min(1, miFila.puntos / lider.puntos)) : 0;
  const vaPrimero = miFila.posicion === 1;

  return (
    <Link
      href={`${base}/tabla`}
      className="aparece presionable relative block overflow-hidden rounded-3xl bg-linear-to-br from-secondary to-card p-5 relieve"
      style={{ animationDelay: "0.08s" }}
    >
      <span aria-hidden className="trama-amarilla absolute -top-2 -right-2 h-44 w-48 [mask-image:radial-gradient(circle_at_80%_20%,#000_10%,transparent_70%)]" />
      <p className="relative text-sm text-muted-foreground">Tu posición en la tabla</p>
      <div className="relative mt-1 flex items-end gap-4">
        <span className="font-display text-[6.5rem] leading-[0.85] text-amarillo [text-shadow:4px_4px_0_var(--violeta-oscuro)]">
          {miFila.posicion}º
        </span>
        <div className="flex flex-col gap-1.5 pb-2">
          <span className="font-heading text-3xl leading-none font-extrabold tabular-nums">
            {miFila.puntos} <span className="text-base font-semibold text-muted-foreground">pts</span>
          </span>
          {miFila.cambio !== null && miFila.cambio !== 0 && tabla.comparadoCon && (
            <span
              className={`rebota self-start rounded-full px-2.5 py-0.5 text-xs font-bold ${miFila.cambio > 0 ? "bg-amarillo text-violeta-oscuro" : "bg-naranja text-violeta-oscuro"}`}
            >
              {miFila.cambio > 0 ? "▲ Subiste" : "▼ Bajaste"} {Math.abs(miFila.cambio)} desde el{" "}
              {diaBarraMes(tabla.comparadoCon)}
            </span>
          )}
        </div>
      </div>
      <div className="relative mt-4">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {vaPrimero
              ? miFila.empatado
                ? "Compartís el primer puesto"
                : "¡Vas primero!"
              : `A ${lider.puntos - miFila.puntos} pts de ${lider.nombre} (1º)`}
          </span>
          <span className="font-semibold text-amarillo">Ver tabla →</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-violeta-oscuro/55">
          <div
            className="se-llena h-full rounded-full bg-linear-to-r from-naranja to-amarillo"
            style={{ width: `${Math.round(progreso * 100)}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

/** Una juntada con forma de entrada: fecha grande, troquelado y quiénes fueron. */
function Ticket({ juntada, href }: { juntada: ResumenDeJuntada; href: string }) {
  const { dia, mes } = diaYMes(juntada.fecha);
  return (
    <Link
      href={href}
      className={`ticket presionable flex rounded-2xl bg-card relieve hover:bg-muted ${juntada.cancelada ? "opacity-60" : ""}`}
    >
      <div className="flex w-[79px] shrink-0 flex-col items-center justify-center border-r-2 border-dashed border-border py-3.5">
        <span className="font-display text-4xl leading-none text-amarillo">{dia}</span>
        <span className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground">{mes}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 px-4 py-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-heading truncate font-semibold">{juntada.titulo ?? "Juntada"}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {juntada.cancelada ? "Cancelada" : `${juntada.asistentes} ${juntada.asistentes === 1 ? "fue" : "fueron"}`}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <AvataresApilados personas={juntada.gente} />
          {juntada.figura && !juntada.cancelada && (
            <span className="truncate text-xs font-semibold text-amarillo">
              Figura: {juntada.figura.nombre} +{juntada.figura.puntos}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
