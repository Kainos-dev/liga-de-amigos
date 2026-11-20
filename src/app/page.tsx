import { Button } from "@/components/ui/button";

const paleta = [
  { nombre: "Violeta", hex: "#310E3F", clase: "bg-violeta ring-1 ring-border" },
  { nombre: "Naranja", hex: "#FF5B42", clase: "bg-naranja" },
  { nombre: "Amarillo", hex: "#FFD749", clase: "bg-amarillo" },
];

// Datos de ejemplo, solo para ver cómo quedan las tipografías.
const rankingEjemplo = [
  { puesto: 1, nombre: "Juli", puntos: 128 },
  { puesto: 2, nombre: "Tomi", puntos: 115 },
  { puesto: 3, nombre: "Caro", puntos: 97 },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-12">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-widest text-amarillo">
          Temporada 2026
        </p>
        {/* Bangers es angosta: aguanta tamaños muy grandes sin desbordar en celular. */}
        <h1 className="font-display text-7xl leading-[0.9] tracking-wide sm:text-8xl">
          Liga de
          <span className="block text-8xl text-naranja sm:text-9xl">Amigos</span>
        </h1>
        <p className="text-muted-foreground">
          Registrá las juntadas del grupo, sumá puntos y descubrí quién es el
          amigo del año.
        </p>
      </div>

      <section className="space-y-3 rounded-xl bg-card p-4">
        <h2 className="font-heading text-lg font-semibold">Ranking del grupo</h2>
        <ol className="space-y-2">
          {rankingEjemplo.map((fila) => (
            <li key={fila.puesto} className="flex items-center gap-3">
              <span className="font-heading w-5 text-lg font-bold text-amarillo">
                {fila.puesto}
              </span>
              <span className="font-heading flex-1 font-medium">{fila.nombre}</span>
              <span className="text-sm tabular-nums text-muted-foreground">
                {fila.puntos} pts
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid grid-cols-3 gap-3">
        {paleta.map((color) => (
          <div key={color.nombre} className="space-y-1.5">
            <div className={`aspect-square rounded-xl ${color.clase}`} />
            <p className="font-heading text-sm font-medium">{color.nombre}</p>
            <p className="text-xs tabular-nums text-muted-foreground">
              {color.hex}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button size="lg">Crear grupo</Button>
        <Button size="lg" variant="secondary">
          Ya tengo grupo
        </Button>
      </div>
    </main>
  );
}
