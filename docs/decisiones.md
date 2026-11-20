# Decisiones técnicas y de producto

Registro de lo decidido hasta ahora. Actualizar cuando algo cambie.

## Stack (confirmado)

| Capa | Elección |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Gestor de paquetes | pnpm |
| UI | Tailwind CSS v4 + shadcn/ui (estilo base-nova) + lucide-react |
| Base de datos | Postgres en Neon |
| Acceso a datos | **SQL directo** con la librería `postgres` (sin ORM) |
| Migraciones | Archivos `.sql` en `db/migrations/`, aplicados con `dbmate` |
| API | Route Handlers de Next en `src/app/api/v1/...` (sin Hono) |
| Validación | Zod |
| Autenticación | Better Auth (conexión directa a Postgres, sin ORM) — Google + enlace mágico por email (Resend) |
| Tests | Vitest (prioridad: motor de puntos y estadísticas) |
| Hosting | Vercel + Neon |
| PWA | `src/app/manifest.ts`; service worker más adelante si hace falta |

**Descartados a propósito:** Drizzle/Prisma (preferencia por SQL explícito) y Hono (no aporta lo suficiente para el MVP). Se mantiene TypeScript simple: tipos de datos + Zod, sin genéricos complejos.

## Arquitectura

```
Página (Server Component) ─┐
                           ├─→ service (lógica + permisos) ─→ SQL
Route Handler /api/v1 ─────┘
```

- `src/server/services/`: toda la lógica de negocio y la validación de permisos. Es lo único que habla con la base.
- `src/server/domain/`: cálculos puros sin base de datos (puntos, desempates, estadísticas). Se testean con Vitest.
- Las páginas leen llamando a los services directamente.
- Las escrituras pasan por `src/app/api/v1/...`. La web las usa hoy y la futura app móvil las va a reutilizar.
- Los Route Handlers son finos: validan con Zod, llaman al service y responden.
- Cada consulta filtra por `grupo_id` y cada service verifica la membresía del usuario.

## Modelo de datos (lineamientos)

- **Participación con estado explícito**: `asistio | ausente_confirmado | no_invitado | sin_dato`.
- **Puntos como libro de registros** (`score_entries` o similar): una fila por punto asignado, con juntada, integrante, regla, versión de reglas, puntos y motivo. Clave única `(juntada, integrante, tipo_de_regla)` para evitar duplicados.
- **Edición de una juntada**: en una transacción se borran sus registros de puntos y se recalculan.
- **Reglas versionadas por temporada**. Si cambian a mitad de temporada, el grupo elige "rige desde hoy" o "recalcular todo".
- **Membresía con fecha de ingreso y egreso**, para comparar asistencia "desde que se incorporó".
- **Cierre de temporada**: se guarda una foto congelada de la tabla final y del resumen anual.
- **`audit_log`**: quién cambió qué y cuándo.
- Los totales se calculan con SQL a partir de los registros, no se guardan como número editable.

## Propuestas para las preguntas pendientes (MVP)

Pendientes de validar con el grupo real:

- **Reglas**: cada grupo tiene su propia liga, que arranca desde una plantilla de valores por defecto.
- **Carga de juntadas**: cualquier integrante puede cargar. Solo los administradores editan pasadas 48 h.
- **Confirmación de asistencia**: no en el MVP.
- **Temporada**: año calendario por defecto, con período de gracia (por ejemplo, 15 días de enero) antes del cierre.
- **Desempates**: más asistencias, después más contribuciones, después empate compartido.
- **Plataforma**: web responsive mobile-first, instalable como PWA.
- **Sin resolver todavía**: juntadas canceladas e invitados externos.

## Identidad visual

| Color | Hex | Uso |
|---|---|---|
| Violeta | `#421454` | Fondos (`bg-background`, `bg-violeta`) |
| Magenta | `#802C62` | Secundario (`bg-secondary`, `bg-magenta`) |
| Naranja | `#FF5B42` | Acción principal (`bg-primary`, `bg-naranja`) |
| Amarillo | `#FFD749` | Acentos, destacados, foco (`bg-accent`, `bg-amarillo`) |

Tema único oscuro sobre violeta, definido en `src/app/globals.css`. Texto crema `#FFF6EC`. Sobre naranja y amarillo se usa texto violeta oscuro `#2A0B37` por contraste.
