-- migrate:up

-- Código corto para unirse a un grupo (ej. "K7M2QX"). El administrador lo
-- comparte y lo puede regenerar si se filtra. Todavía no hay grupos creados,
-- por eso la columna puede ser NOT NULL directamente.
ALTER TABLE grupos
  ADD COLUMN codigo text NOT NULL UNIQUE;

-- Pedidos para entrar a un grupo con el código. Quedan pendientes hasta que
-- un administrador los acepta o rechaza (así nadie entra solo con el código).
CREATE TABLE solicitudes_ingreso (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id      uuid NOT NULL REFERENCES grupos (id) ON DELETE CASCADE,
  usuario_id    uuid NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  estado        text NOT NULL DEFAULT 'pendiente'
                CHECK (estado IN ('pendiente', 'aceptada', 'rechazada')),
  creado_en     timestamptz NOT NULL DEFAULT now(),
  resuelta_en   timestamptz,
  resuelta_por  uuid REFERENCES usuarios (id) ON DELETE SET NULL
);

-- Una sola solicitud pendiente por persona y grupo.
CREATE UNIQUE INDEX solicitudes_una_pendiente
  ON solicitudes_ingreso (grupo_id, usuario_id)
  WHERE estado = 'pendiente';

-- migrate:down

DROP TABLE solicitudes_ingreso;

ALTER TABLE grupos
  DROP COLUMN codigo;
