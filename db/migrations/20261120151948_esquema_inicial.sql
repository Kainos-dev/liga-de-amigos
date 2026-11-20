-- migrate:up

-- Esquema inicial de Liga de Amigos.
--
-- Nota sobre las claves foráneas "compuestas" (grupo_id, x_id):
-- casi todas las tablas guardan grupo_id y apuntan a otras tablas con el par
-- (grupo_id, id). Así la base misma impide, por ejemplo, anotar en una juntada
-- del grupo A a un integrante del grupo B, aunque el código tuviera un error.
--
-- Las tablas de usuarios y sesiones las crea Better Auth en la etapa 2.
-- Por eso integrantes.usuario_id todavía no tiene clave foránea.

CREATE TABLE grupos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     text NOT NULL CHECK (length(trim(nombre)) > 0),
  creado_en  timestamptz NOT NULL DEFAULT now()
);

-- Un integrante puede existir sin cuenta (usuario_id NULL): alguien que va a
-- las juntadas pero no usa la app. Si después se registra, reclama su perfil.
CREATE TABLE integrantes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id    uuid NOT NULL REFERENCES grupos (id) ON DELETE CASCADE,
  nombre      text NOT NULL CHECK (length(trim(nombre)) > 0),
  usuario_id  text,
  rol         text NOT NULL DEFAULT 'miembro' CHECK (rol IN ('admin', 'miembro')),
  ingreso_en  date NOT NULL DEFAULT current_date,
  egreso_en   date,
  creado_en   timestamptz NOT NULL DEFAULT now(),
  CHECK (egreso_en IS NULL OR egreso_en >= ingreso_en),
  UNIQUE (grupo_id, usuario_id), -- una misma cuenta, un solo perfil por grupo
  UNIQUE (grupo_id, id)
);

CREATE TABLE temporadas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id    uuid NOT NULL REFERENCES grupos (id) ON DELETE CASCADE,
  anio        integer NOT NULL,
  inicio      date NOT NULL,
  fin         date NOT NULL,
  cerrada_en  timestamptz, -- NULL = abierta
  creado_en   timestamptz NOT NULL DEFAULT now(),
  CHECK (fin >= inicio),
  UNIQUE (grupo_id, anio),
  UNIQUE (grupo_id, id)
);

-- Acciones puntuables de cada grupo. clave marca las que aplica el sistema
-- solo según la asistencia ('asistir', 'faltar'); el resto se marcan a mano.
-- Una acción usada no se borra: se archiva (archivada_en).
CREATE TABLE acciones (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id      uuid NOT NULL REFERENCES grupos (id) ON DELETE CASCADE,
  clave         text CHECK (clave IN ('asistir', 'faltar')),
  nombre        text NOT NULL CHECK (length(trim(nombre)) > 0),
  archivada_en  timestamptz,
  creado_en     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (grupo_id, clave), -- como mucho una de cada clave por grupo (NULL no cuenta)
  UNIQUE (grupo_id, id)
);

-- Dos acciones activas del mismo grupo no pueden llamarse igual.
CREATE UNIQUE INDEX acciones_nombre_activo_unico
  ON acciones (grupo_id, lower(nombre))
  WHERE archivada_en IS NULL;

-- Historial de puntos de cada acción. Cambiar el valor agrega una fila nueva
-- "vigente desde" esa fecha; lo anterior conserva el valor que tenía.
CREATE TABLE acciones_puntos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accion_id      uuid NOT NULL REFERENCES acciones (id) ON DELETE CASCADE,
  puntos         integer NOT NULL, -- puede ser negativo
  vigente_desde  date NOT NULL,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (accion_id, vigente_desde)
);

CREATE TABLE juntadas (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id            uuid NOT NULL REFERENCES grupos (id) ON DELETE CASCADE,
  temporada_id        uuid NOT NULL,
  fecha               date NOT NULL,
  titulo              text,
  notas               text,
  invitados_externos  text, -- texto libre, sin puntos ("vinieron 2 amigos de Juli")
  cancelada_en        timestamptz, -- cancelada = no suma puntos
  creado_por          uuid, -- integrante que la cargó
  creado_en           timestamptz NOT NULL DEFAULT now(),
  actualizado_en      timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (grupo_id, temporada_id) REFERENCES temporadas (grupo_id, id),
  FOREIGN KEY (grupo_id, creado_por) REFERENCES integrantes (grupo_id, id),
  UNIQUE (grupo_id, id)
);

CREATE INDEX juntadas_grupo_fecha ON juntadas (grupo_id, fecha);

-- Estado de cada integrante en una juntada. Si no hay fila, es "sin dato".
CREATE TABLE participaciones (
  grupo_id       uuid NOT NULL REFERENCES grupos (id) ON DELETE CASCADE,
  juntada_id     uuid NOT NULL,
  integrante_id  uuid NOT NULL,
  estado         text NOT NULL
                 CHECK (estado IN ('asistio', 'ausente_confirmado', 'no_invitado', 'sin_dato')),
  PRIMARY KEY (juntada_id, integrante_id), -- un solo estado por persona y juntada
  FOREIGN KEY (grupo_id, juntada_id) REFERENCES juntadas (grupo_id, id) ON DELETE CASCADE,
  FOREIGN KEY (grupo_id, integrante_id) REFERENCES integrantes (grupo_id, id)
);

-- Acciones marcadas a mano: dentro de una juntada ("Juli cocinó") o sueltas,
-- sin juntada ("Tomi se acordó del cumpleaños"), con juntada_id NULL.
CREATE TABLE acciones_registradas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id       uuid NOT NULL REFERENCES grupos (id) ON DELETE CASCADE,
  temporada_id   uuid NOT NULL,
  integrante_id  uuid NOT NULL,
  accion_id      uuid NOT NULL,
  juntada_id     uuid,
  fecha          date NOT NULL,
  nota           text,
  creado_por     uuid,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (grupo_id, temporada_id) REFERENCES temporadas (grupo_id, id),
  FOREIGN KEY (grupo_id, integrante_id) REFERENCES integrantes (grupo_id, id),
  FOREIGN KEY (grupo_id, accion_id) REFERENCES acciones (grupo_id, id),
  FOREIGN KEY (grupo_id, juntada_id) REFERENCES juntadas (grupo_id, id) ON DELETE CASCADE,
  FOREIGN KEY (grupo_id, creado_por) REFERENCES integrantes (grupo_id, id),
  -- Dentro de una juntada, la misma acción una sola vez por persona.
  -- (Las sueltas tienen juntada_id NULL y Postgres no las considera repetidas.)
  UNIQUE (juntada_id, integrante_id, accion_id)
);

CREATE INDEX acciones_registradas_sueltas
  ON acciones_registradas (grupo_id, fecha)
  WHERE juntada_id IS NULL;

-- Libro de puntos: una fila por cada punto asignado, con su motivo.
-- Los totales y la tabla se calculan sumando estas filas; nunca se guarda un
-- total. Se generan con el motor de puntos (src/server/domain/puntos.ts):
-- al editar una juntada se borran sus filas y se vuelven a generar.
CREATE TABLE registros_puntos (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id              uuid NOT NULL REFERENCES grupos (id) ON DELETE CASCADE,
  temporada_id          uuid NOT NULL,
  integrante_id         uuid NOT NULL,
  accion_id             uuid NOT NULL,
  juntada_id            uuid,
  accion_registrada_id  uuid REFERENCES acciones_registradas (id) ON DELETE CASCADE,
  fecha                 date NOT NULL,
  puntos                integer NOT NULL,
  motivo                text NOT NULL,
  creado_en             timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (grupo_id, temporada_id) REFERENCES temporadas (grupo_id, id),
  FOREIGN KEY (grupo_id, integrante_id) REFERENCES integrantes (grupo_id, id),
  FOREIGN KEY (grupo_id, accion_id) REFERENCES acciones (grupo_id, id),
  FOREIGN KEY (grupo_id, juntada_id) REFERENCES juntadas (grupo_id, id) ON DELETE CASCADE,
  -- Todo punto sale de una juntada o de una acción suelta.
  CHECK (juntada_id IS NOT NULL OR accion_registrada_id IS NOT NULL),
  -- Anti duplicados: la misma acción no puede puntuar dos veces a la misma
  -- persona en la misma juntada, ni una acción suelta generar dos registros.
  UNIQUE (juntada_id, integrante_id, accion_id),
  UNIQUE (accion_registrada_id)
);

CREATE INDEX registros_puntos_tabla
  ON registros_puntos (grupo_id, temporada_id, integrante_id);

-- Historial de cambios relevantes: quién hizo qué y cuándo.
CREATE TABLE audit_log (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  grupo_id    uuid REFERENCES grupos (id) ON DELETE CASCADE,
  usuario_id  text,
  accion      text NOT NULL, -- por ejemplo 'juntada.editar'
  entidad     text NOT NULL, -- por ejemplo 'juntada'
  entidad_id  uuid,
  datos       jsonb, -- antes/después u otros detalles
  creado_en   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_grupo ON audit_log (grupo_id, creado_en DESC);

-- migrate:down

DROP TABLE audit_log;
DROP TABLE registros_puntos;
DROP TABLE acciones_registradas;
DROP TABLE participaciones;
DROP TABLE juntadas;
DROP TABLE acciones_puntos;
DROP TABLE acciones;
DROP TABLE temporadas;
DROP TABLE integrantes;
DROP TABLE grupos;
