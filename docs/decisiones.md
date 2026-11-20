# Decisiones técnicas y de producto

Registro de lo decidido hasta ahora. Actualizar cuando algo cambie.

## Stack (confirmado)

| Capa | Elección |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Gestor de paquetes | pnpm |
| UI | Tailwind CSS v4 + shadcn/ui (estilo base-nova) + lucide-react + Motion (animaciones con gestos) |
| Base de datos | Postgres en Neon |
| Acceso a datos | **SQL directo** con la librería `postgres` (sin ORM) |
| Migraciones | Archivos `.sql` en `db/migrations/`, aplicados con `dbmate`. En producción, automáticas al publicar en Vercel (`scripts/vercel-build.mjs`, solo en `VERCEL_ENV=production`) |
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

- **Sin email ni verificación**: se entra con el **nombre o apodo + PIN** (al menos 6 caracteres), desde cualquier dispositivo. No hay un "usuario" aparte: el nombre es único en toda la app, sin distinguir mayúsculas ni espacios de más ("Tomi" y " tomi " son el mismo). Si ya existe, hay que agregarle algo ("Tomi R.").
- **Nombre fijo**: el nombre o apodo no se puede cambiar (solo eliminar la cuenta y crear otra) y es el mismo en todos los grupos. Sin edad.
- **Foto de perfil**: opcional, se elige al crear la cuenta y se puede cambiar o sacar desde "Mi cuenta". El navegador la achica a 256x256 JPEG (~20 KB, `src/lib/achicar-imagen.ts`) y se guarda en `usuarios.foto` (máx. 300 KB, el servidor revisa que sea una imagen real). Se sirve en `/api/v1/usuarios/[id]/foto?v=...` solo a quien comparte un grupo con esa persona, con caché del navegador. Sin foto: la inicial del nombre sobre un color de la paleta calculado a partir del nombre (`src/lib/avatares.ts`), siempre el mismo para cada persona.
- **Seguridad**: el PIN se guarda con scrypt; la sesión es un token aleatorio en una cookie httpOnly y en la base solo se guarda su hash. Tras 5 PIN incorrectos la cuenta se bloquea 15 minutos. La API también acepta `Authorization: Bearer <token>` para la futura app móvil.
- **Eliminar la cuenta**: pide el PIN. En los grupos el perfil queda como integrante sin cuenta, con su historial y sus puntos.
- Código: `src/server/domain/cuentas.ts` (reglas), `src/server/auth/credenciales.ts` (PIN y tokens), `src/server/services/cuentas.ts`, `src/server/sesion.ts`, API en `src/app/api/v1/cuentas` y `src/app/api/v1/sesiones`.

## Grupos (confirmado)

- **Crear un grupo** deja a quien lo crea como administrador y carga la temporada del año y la lista de acciones por defecto.
- **Código para unirse**: 6 caracteres sin letras ni números que se confundan (sin 0/O, 1/I/L, 5/S). Lo ven todos los integrantes, para que cualquiera lo pueda pasar; solo un administrador lo regenera.
- **Solicitudes**: con el código se pide entrar y queda pendiente hasta que un administrador acepta o rechaza. Una sola pendiente por persona y grupo. Si la rechazan, puede volver a pedir.
- **Vincular al aceptar**: el administrador puede elegir un perfil sin cuenta ya cargado ("Juli"); la persona se queda con ese historial y el perfil toma el nombre de su cuenta. Si alguien se fue y vuelve, se reincorpora con su perfil anterior.
- **Roles**: un administrador puede nombrar o quitar administradores. Un perfil sin cuenta no puede ser administrador. El grupo nunca se queda sin administradores (tampoco al eliminar la cuenta).
- **Salir o sacar a alguien** no borra nada: se marca la fecha de egreso y su historial queda.
- **Fechas**: "hoy" se calcula con la hora de Argentina (`src/server/domain/fechas.ts`), porque el servidor corre en UTC.
- Código: `src/server/domain/grupos.ts`, `src/server/services/{grupos,solicitudes,integrantes,permisos,auditoria}.ts`, API en `src/app/api/v1/grupos` y `src/app/api/v1/solicitudes`.

## Juntadas y puntos sueltos (confirmado)

- **Registrar**: cualquier integrante. Fecha (no futura), título, asistencia de cada uno (fue / faltó / no invitado / sin dato), acciones marcadas, invitados de afuera y notas. Tiene que haber al menos una persona que fue.
- **Editar, cancelar o eliminar**: cualquier integrante dentro de las 48 h desde que se cargó; después, solo los administradores. Editar reemplaza todo el contenido y recalcula los puntos en una transacción.
- **Cancelada**: queda en el historial pero no suma ni resta. Se puede reactivar.
- **Temporada**: cada carga va a la temporada del año de su fecha (se crea sola si no existe). No se puede cargar ni editar en una temporada cerrada o pasado el período de gracia.
- **Integrantes**: se puede anotar a cualquiera activo del grupo, aunque se haya sumado después de la fecha (para cargar juntadas viejas). Al editar se mantiene a quien ya estaba aunque se haya ido.
- **Acciones archivadas**: no se pueden usar en cargas nuevas; al editar se mantienen si ya estaban.
- **Puntos sueltos**: fuera de una juntada, con fecha, persona, acción y nota. Asistir y Faltar no se pueden usar sueltas. Se borran (mismas reglas de 48 h).
- **Vista previa**: el formulario usa el mismo motor de puntos (`src/server/domain/puntos.ts`, código puro) para mostrar cómo quedan los puntos antes de guardar; el servidor recalcula todo igual.
- Código: `src/server/domain/juntadas.ts`, `src/server/services/{juntadas,acciones-sueltas,acciones,temporadas}.ts`, API en `src/app/api/v1/grupos/[grupoId]/{juntadas,acciones-sueltas,acciones}`.

## Tabla de la liga (confirmado)

- **Se arma siempre desde los registros de puntos** de la temporada (`src/server/services/tabla.ts` + `src/server/domain/tabla.ts`). Nunca se guarda un total.
- **Quiénes aparecen**: integrantes activos, más quienes se fueron pero tienen puntos o asistencia en esa temporada (marcados "ya no está").
- **Cambio de posición (flechas)**: respecto de la tabla al cierre del mes anterior. En enero no hay comparación; para temporadas pasadas se compara con el 1 de diciembre.
- **Porcentaje de asistencia**: fue / (fue + faltó). "No invitado" y "sin dato" no cuentan; sin datos se muestra "–", no 0%. Sale de la asistencia cargada, no de los puntos.
- **Detalle por persona**: fue, faltó, % de asistencia, aportes (acciones positivas que no son asistir) y desglose por acción (veces y puntos).
- **Temporadas pasadas**: se eligen con `?anio=`.
- Las juntadas canceladas no cuentan ni en puntos ni en asistencia.

## Configuración de acciones (confirmado)

- **Pantalla "Reglas y puntos"** (`/grupos/[id]/reglas`): todos la ven; solo los administradores cambian algo.
- **Cambiar puntos**: el valor nuevo rige desde hoy (se agrega un valor "vigente desde hoy"; si se cambia dos veces el mismo día, se pisa). Lo cargado con fecha anterior conserva su valor, aunque se edite. Lo cargado con fecha de hoy pasa al valor nuevo.
- **Rango**: de -50 a +50, enteros.
- **Renombrar**: el nombre nuevo se ve también en los puntos ya cargados.
- **Crear acciones propias** del grupo, con puntos positivos o negativos.
- **Archivar**: la acción no se puede usar en cargas nuevas, pero sus puntos siguen contando y se mantiene en las juntadas que ya la tenían. Se puede reactivar si su nombre no choca con otra activa.
- **Asistir y Faltar** no se archivan; si el grupo no quiere que sumen o resten, se les pone 0.
- Código: `src/server/domain/configuracion-acciones.ts` (separado de `acciones.ts`, que también se usa en el navegador), `src/server/services/configuracion-acciones.ts`, API `GET/POST /api/v1/grupos/[grupoId]/acciones` (`?todas=1` incluye archivadas) y `PATCH .../acciones/[accionId]`.

## Resúmenes y cierre de temporada (confirmado)

- **No se inventan ganadores**: cada destacado aparece solo si hay datos que lo respalden; los empates se muestran como empates. La lógica está en `src/server/domain/resumenes.ts` (con tests).
- **Resumen del mes** (`/grupos/[id]/resumen?mes=AAAA-MM`): juntadas, promedio de asistentes, figura del mes (más puntos), el más presente, destacados por cada acción positiva (quién la hizo más veces), mayor subida y bajada en la tabla respecto del inicio del mes, el desastre del mes (más puntos perdidos) y la juntada más concurrida (solo si hubo al menos dos).
- **Resumen del año** (`/grupos/[id]/resumen-anual?anio=`): campeón (o "va primero" mientras está abierta), juntadas por mes (gráfico de barras con vista en tabla), mes más activo y más flojo (los meses que no pasaron no cuentan), promedio de asistentes, el más constante (mejor % de asistencia con al menos 3 juntadas con dato, para no castigar a quien se sumó tarde), el más presente, destacados por acción, mayor ascenso y caída desde el cierre del primer mes con puntos, y el desastre del año.
- **Cierre de temporada**: solo administradores, desde el 1 de enero. Guarda una foto (`cierres_temporada`) de la tabla final y del resumen anual; desde ahí se muestran, aunque después alguien se vaya o se renombre una acción. Una temporada cerrada no admite cargas ni ediciones. No se reabre.
- Pasado el período de gracia, aunque nadie la cierre, la temporada ya no admite cargas.

## Plan de desarrollo por etapas

1. **Motor de puntos y esquema de base** — hecho: dominio con tests y primera migración.
2. **Cuentas** — hecho: usuario + PIN sin email, sesiones, crear cuenta, entrar, salir y eliminar cuenta.
3. **Grupos e integrantes** — hecho: crear grupo, código para unirse, solicitudes que acepta un administrador, roles e integrantes sin cuenta.
4. **Juntadas y acciones sueltas** — hecho: registrar, editar, cancelar y eliminar juntadas con recálculo de puntos; puntos sueltos.
5. **Tabla de la liga** — hecho: posiciones, desglose, asistencia y cambios de posición; adelanto en el inicio del grupo.
6. **Acciones configurables** — hecho: editar puntos (rigen desde hoy), renombrar, crear y archivar acciones.
7. **Resúmenes y temporadas** — hecho: resumen mensual y anual, cierre de temporada con foto congelada.

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

## Dirección visual: "la liga del barrio" (confirmado)

Mezcla de álbum de figuritas, gráficos de transmisión deportiva y un toque de historieta. Maqueta de referencia: artifact "Liga de Amigos · Maqueta visual".

- **Fondo** (`src/components/fondo.tsx`): violeta con dos resplandores difusos (naranja y amarillo) que se mueven despacio y grano fino. Fijo detrás de todo.
- **Utilidades en `globals.css`**: `titulo-sticker` (Bangers con sombra sólida doble), `trama-amarilla` / `trama-oscura` / `trama-naranja` (puntos de historieta), `relieve` (borde y sombra de tarjeta), `presionable` (se hunde al tocar), `ticket` (muescas de entrada), `aparece` + `animation-delay` para entradas en cascada, `confeti`.
- **Barra inferior** dentro de cada grupo: Inicio · Tabla · [+ Registrar] · Resúmenes · Grupo. Se oculta en los formularios de juntada y en la historia del año.
- **Inicio del grupo**: tarjeta "Tu posición" (puesto gigante, puntos, cambio y distancia al primero) y juntadas como entradas (fecha grande, troquelado, avatares de quienes fueron, figura de la juntada si no hubo empate).
- **Tabla**: podio de los 3 primeros (bloques que crecen, corona), puntos que suben como contador y "figurita" al tocar a alguien.
- **Historia del año** (`/grupos/[id]/resumen-anual/historia`): pantallas a pantalla completa estilo "Wrapped", con Motion (deslizar, tocar, mantener para pausar). Solo incluye pantallas con datos reales. Se puede compartir el resultado.
- **Confeti** al registrar una juntada.
- **Movimiento con criterio**: todo se apaga si el sistema pide "reducir movimiento".
- **Motion** se usa solo donde hay gestos o transiciones entre pantallas (historia, figurita, contador). El resto es CSS.
