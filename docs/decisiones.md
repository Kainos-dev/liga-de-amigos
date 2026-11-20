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
| Autenticación | Propia: usuario + PIN, sin email (scrypt y tokens con `node:crypto`, sesiones en Postgres) |
| Tests | Vitest (prioridad: motor de puntos y estadísticas) |
| Hosting | Vercel + Neon |
| PWA | `src/app/manifest.ts`; service worker más adelante si hace falta |

**Descartados a propósito:** Drizzle/Prisma (preferencia por SQL explícito), Hono (no aporta lo suficiente para el MVP) y Better Auth (para usuario + PIN no hacía falta, y sumaba otra librería de conexión a Postgres). Se mantiene TypeScript simple: tipos de datos + Zod, sin genéricos complejos.

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

## Modelo de datos

Esquema en `db/migrations/20261120151948_esquema_inicial.sql`. Motor de puntos en `src/server/domain/`.

- **Integrantes sin cuenta**: un integrante puede existir sin usuario (alguien que va a las juntadas pero no usa la app). Si después se registra, reclama ese perfil con su historial.
- **Membresía con fecha de ingreso y egreso**, para comparar asistencia "desde que se incorporó".
- **Participación con estado explícito**: `asistio | ausente_confirmado | no_invitado | sin_dato`. Sin fila = sin dato.
- **Puntos como libro de registros** (`registros_puntos`): una fila por punto asignado, con integrante, acción, puntos y motivo. Claves únicas para que la misma acción no puntúe dos veces a la misma persona en la misma juntada.
- **Edición de una juntada**: en una transacción se borran sus registros de puntos y se recalculan.
- **Claves foráneas compuestas `(grupo_id, id)`**: la base impide mezclar datos de grupos distintos.
- **Cierre de temporada**: se guarda una foto congelada de la tabla final y del resumen anual.
- **`audit_log`**: quién cambió qué y cuándo.
- Los totales se calculan con SQL a partir de los registros, no se guardan como número editable. Pueden ser negativos.

## Acciones y puntos (confirmado)

- Cada grupo tiene su lista de **acciones** con puntos **positivos o negativos**. Al crear el grupo se copia la lista por defecto; después el grupo edita los puntos y agrega o archiva acciones.
- **Asistencia automática**: marcar "asistió" aplica la acción *Asistir*; marcar "faltó" (ausencia confirmada) aplica *Faltar*. "No invitado" y "sin dato" no suman ni restan.
- **Acciones especiales encima**: se suman a la automática (Faltar -1 + Faltó por estar con la pareja -3 = -4).
- **Cada uno suma por separado**: si cocinan dos, cada uno recibe los puntos completos.
- **Contribuir sin asistir** está permitido (prestó la casa y no fue).
- **Una vez por persona, por acción y por juntada.**
- **Acciones sueltas**: también se cargan puntos fuera de una juntada, con fecha y acción ("se acordó del cumpleaños").
- **Cambio de puntos**: se guarda un historial de valores "vigente desde". Cada evento usa el valor vigente **en su fecha**, así lo ya pasado conserva su valor aunque se edite después. Más adelante: opción "recalcular toda la temporada".
- **Quién edita acciones**: solo administradores. Una acción usada no se borra, se archiva.
- **Desempates**: más asistencias, después más contribuciones (acciones positivas que no son asistir), después posición compartida.

Lista por defecto (`ACCIONES_POR_DEFECTO` en `src/server/domain/acciones.ts`):

| Acción | Puntos |
|---|---|
| Asistir (automática) | +3 |
| Poner casa | +3 |
| Cocinar | +2 |
| Organizar | +2 |
| Propuso plan | +1 |
| Poner auto | +1 |
| Faltar (automática) | -1 |
| Faltar sin avisar | -3 |
| Faltó por estar con la pareja | -3 |
| Llegar muy tarde | -2 |

## Cuentas (confirmado)

- **Sin email ni verificación**: la cuenta es un nombre de usuario único (sin distinguir mayúsculas) + un PIN de al menos 6 caracteres. Con eso se entra desde cualquier dispositivo.
- **Perfil fijo**: nombre o apodo, emoji y color de avatar. No se pueden cambiar; solo eliminar la cuenta y crear otra. El nombre es el mismo en todos los grupos. Sin edad.
- **Foto de perfil**: más adelante. Se guardaría achicada (~20 KB) directo en Postgres, sin servicio de imágenes pago.
- **Seguridad**: el PIN se guarda con scrypt; la sesión es un token aleatorio en una cookie httpOnly y en la base solo se guarda su hash. Tras 5 PIN incorrectos la cuenta se bloquea 15 minutos. La API también acepta `Authorization: Bearer <token>` para la futura app móvil.
- **Eliminar la cuenta**: pide el PIN. En los grupos el perfil queda como integrante sin cuenta, con su historial y sus puntos.
- Código: `src/server/domain/cuentas.ts` (reglas), `src/server/auth/credenciales.ts` (PIN y tokens), `src/server/services/cuentas.ts`, `src/server/sesion.ts`, API en `src/app/api/v1/cuentas` y `src/app/api/v1/sesiones`.

## Plan de desarrollo por etapas

1. **Motor de puntos y esquema de base** — hecho: dominio con tests y primera migración.
2. **Cuentas** — hecho: usuario + PIN sin email, sesiones, crear cuenta, entrar, salir y eliminar cuenta.
3. **Grupos e integrantes**: crear grupo, código para unirse, solicitudes que acepta un administrador, roles.
4. **Juntadas y acciones sueltas**: registrar y editar, con recálculo de puntos e historial.
5. **Tabla de la liga**: posiciones, desglose y cambios de posición.
6. **Acciones configurables**: editar puntos y agregar o archivar acciones.
7. **Resúmenes y temporadas**: resumen mensual y anual, cierre de temporada.

## Propuestas para las preguntas pendientes (MVP)

Pendientes de validar con el grupo real:

- **Carga de juntadas**: cualquier integrante puede cargar. Solo los administradores editan pasadas 48 h.
- **Confirmación de asistencia**: no en el MVP.
- **Temporada**: año calendario por defecto, con período de gracia de 15 días de enero antes del cierre.
- **Plataforma**: web responsive mobile-first, instalable como PWA.

Confirmadas:

- **Administradores**: el que crea el grupo es administrador y puede nombrar a otros.
- **Ingreso a grupos**: cada grupo tiene un código corto que el administrador comparte y puede regenerar. Quien lo usa queda como solicitud pendiente hasta que un administrador la acepta (para evitar infiltrados). Al aceptar se puede vincular a un perfil sin cuenta ya existente.
- **Nombre del grupo**: lo pueden cambiar los administradores.
- **Juntada cancelada**: se borra o se marca cancelada y no suma puntos.
- **Invitados externos**: texto libre en la juntada, sin puntos.
- **Base de datos**: por ahora se desarrolla sobre la base de Neon del `.env`. Antes de que entre el grupo real, crear una base (o branch) separada para producción.

## Identidad visual

| Color | Hex | Uso |
|---|---|---|
| Violeta | `#310e3f` | Fondos (`bg-background`, `bg-violeta`) |
| Naranja | `#FF5B42` | Acción principal (`bg-primary`, `bg-naranja`) |
| Amarillo | `#FFD749` | Acentos, destacados, foco (`bg-accent`, `bg-amarillo`) |

Tema único oscuro sobre violeta, definido en `src/app/globals.css`. Texto crema `#FFF6EC`. Sobre naranja y amarillo se usa texto violeta oscuro `#1E0727` por contraste. El secundario (`bg-secondary`) es un violeta más claro (`#5B2B78`), no un color aparte.

| Tipografía | Clase | Uso |
|---|---|---|
| Bangers | `font-display` | Logo, títulos principales, encabezados especiales |
| Outfit | `font-heading` | Títulos secundarios, tarjetas, nombres y rankings |
| Inter | `font-sans` (por defecto) | Descripciones, navegación, formularios y datos |

Se cargan con `next/font/google` en `src/app/layout.tsx` (sin dependencias extra).
