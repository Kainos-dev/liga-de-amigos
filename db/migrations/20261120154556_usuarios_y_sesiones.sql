-- migrate:up

-- Cuentas sin email: nombre de usuario único + PIN.
-- El nombre visible, el emoji y el color no se pueden cambiar una vez creada
-- la cuenta (solo eliminarla y crear otra).
CREATE TABLE usuarios (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario            text NOT NULL, -- para entrar, ej. "tomi_el_tano"
  nombre             text NOT NULL CHECK (length(trim(nombre)) > 0), -- el que ven los demás
  avatar_emoji       text NOT NULL,
  avatar_color       text NOT NULL,
  pin_hash           text NOT NULL, -- nunca el PIN en texto plano
  intentos_fallidos  integer NOT NULL DEFAULT 0,
  bloqueado_hasta    timestamptz, -- freno contra quien prueba PINs al azar
  creado_en          timestamptz NOT NULL DEFAULT now()
);

-- "Tomi" y "tomi" son el mismo usuario.
CREATE UNIQUE INDEX usuarios_usuario_unico ON usuarios (lower(usuario));

-- Sesiones abiertas. La cookie lleva un token aleatorio; acá se guarda solo
-- su hash, así que aunque alguien leyera esta tabla no podría usar las sesiones.
CREATE TABLE sesiones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  uuid NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,
  vence_en    timestamptz NOT NULL,
  creado_en   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sesiones_usuario ON sesiones (usuario_id);

-- Vincular integrantes con cuentas. Si se elimina la cuenta, el integrante
-- queda en el grupo sin cuenta, con su historial y sus puntos (SET NULL).
ALTER TABLE integrantes
  ALTER COLUMN usuario_id TYPE uuid USING usuario_id::uuid,
  ADD FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE SET NULL;

-- audit_log.usuario_id también pasa a uuid. Sin clave foránea a propósito:
-- el historial se conserva aunque la cuenta se elimine.
ALTER TABLE audit_log
  ALTER COLUMN usuario_id TYPE uuid USING usuario_id::uuid;

-- migrate:down

ALTER TABLE audit_log
  ALTER COLUMN usuario_id TYPE text;

ALTER TABLE integrantes
  DROP CONSTRAINT integrantes_usuario_id_fkey,
  ALTER COLUMN usuario_id TYPE text;

DROP TABLE sesiones;
DROP TABLE usuarios;
