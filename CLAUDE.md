@AGENTS.md

# Liga de Amigos

Plataforma para que grupos de amigos registren sus juntadas y compitan en una liga anual de puntos interna a cada grupo.

- Especificación del producto: `docs/especificacion-funcional.md`
- Decisiones técnicas y de producto (stack, arquitectura, modelo, paleta): `docs/decisiones.md`. Leerlo antes de proponer cambios de stack o de modelo.

## Sobre el desarrollador

Todavía no está muy familiarizado con TypeScript y tuvo malas experiencias con ORMs. Priorizar código simple y legible. Explicar las decisiones no obvias. No sumar librerías nuevas sin consultar.

## Reglas del proyecto

- Usar **pnpm** (nunca npm ni yarn).
- Interfaz y textos en **español rioplatense** ("registrá", "juntada").
- **Sin ORM**: SQL directo con `sql` de `src/server/db.ts` (librería `postgres`). Siempre con valores en `${}`, nunca concatenando strings.
- **Migraciones**: `pnpm db:new <nombre>` crea el archivo en `db/migrations/`. Escribir SQL en `-- migrate:up` y `-- migrate:down`. Aplicar con `pnpm db:migrate`.
- **Capas**: páginas y route handlers → `src/server/services/` (lógica + permisos) → SQL. Los cálculos puros van en `src/server/domain/` con tests Vitest al lado (`*.test.ts`).
- **API** para escrituras en `src/app/api/v1/...`, validada con Zod. Debe poder usarla una futura app móvil.
- **Permisos siempre en el servidor**: todo service que toca datos de un grupo verifica la membresía del usuario.
- **Puntos**: nunca guardar un total editable. Siempre se derivan de los registros de puntos y no se pueden duplicar.
- **Mobile-first**: diseñar para celular (gutter de 16px) y adaptar a pantallas grandes.
- **Colores**: usar los tokens (`bg-primary`, `bg-violeta`, `text-amarillo`, etc.), no hex sueltos.

## Comandos

```
pnpm dev          # servidor de desarrollo
pnpm lint
pnpm typecheck
pnpm test         # Vitest
pnpm db:migrate   # aplica migraciones (lee DATABASE_URL de .env)
pnpm db:status
```

## Estado actual

Etapa 1 lista: motor de puntos en `src/server/domain/` (con tests) y primera migración en `db/migrations/` (aplicada en Neon). Plan completo por etapas en `docs/decisiones.md`.

Próximo paso: etapa 2, login con Better Auth.
