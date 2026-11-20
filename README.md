# Liga de Amigos

Registrá las juntadas de tu grupo, sumá puntos y descubrí quién es el amigo del año.

## Requisitos

- Node.js 24+
- pnpm
- Una base Postgres en [Neon](https://neon.tech)

## Puesta en marcha

```bash
pnpm install
cp .env.example .env   # completar DATABASE_URL
pnpm db:migrate
pnpm dev
```

Abrir http://localhost:3000.

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Build de producción |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Chequeo de tipos |
| `pnpm test` | Tests con Vitest |
| `pnpm db:new <nombre>` | Crea una migración SQL en `db/migrations/` |
| `pnpm db:migrate` | Aplica migraciones pendientes |
| `pnpm db:rollback` | Revierte la última migración |
| `pnpm db:status` | Muestra el estado de las migraciones |

## Documentación

- [Especificación funcional](docs/especificacion-funcional.md)
- [Decisiones técnicas](docs/decisiones.md)
