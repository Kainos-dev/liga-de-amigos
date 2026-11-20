import { Button } from "@/components/ui/button";

const paleta = [
  { nombre: "Violeta", hex: "#421454", clase: "bg-violeta ring-1 ring-border" },
  { nombre: "Magenta", hex: "#802C62", clase: "bg-magenta" },
  { nombre: "Naranja", hex: "#FF5B42", clase: "bg-naranja" },
  { nombre: "Amarillo", hex: "#FFD749", clase: "bg-amarillo" },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-12">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-widest text-amarillo">
          Temporada 2026
        </p>
        <h1 className="text-4xl font-bold tracking-tight">
          Liga de <span className="text-naranja">Amigos</span>
        </h1>
        <p className="text-muted-foreground">
          Registrá las juntadas del grupo, sumá puntos y descubrí quién es el
          amigo del año.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {paleta.map((color) => (
          <div key={color.nombre} className="space-y-1.5">
            <div className={`aspect-square rounded-xl ${color.clase}`} />
            <p className="text-xs font-medium">{color.nombre}</p>
            <p className="font-mono text-[10px] text-muted-foreground">
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
