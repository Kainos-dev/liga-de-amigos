-- migrate:up

-- Se entra con el nombre o apodo + PIN: ya no hay un "usuario" aparte.
-- Por eso el nombre pasa a ser único en toda la app, sin distinguir
-- mayúsculas ni espacios de más ("Tomi", "tomi" y " Tomi  " son el mismo).
-- La app ya guarda el nombre normalizado; el índice lo vuelve a normalizar
-- por las dudas.
--
-- Si hubiera dos cuentas con el mismo nombre, esta migración falla y no
-- cambia nada: habría que renombrar una antes de aplicarla.

UPDATE usuarios SET nombre = regexp_replace(btrim(nombre), '\s+', ' ', 'g');

CREATE UNIQUE INDEX usuarios_nombre_unico
  ON usuarios (lower(regexp_replace(btrim(nombre), '\s+', ' ', 'g')));

DROP INDEX usuarios_usuario_unico;
ALTER TABLE usuarios DROP COLUMN usuario;

-- migrate:down

ALTER TABLE usuarios ADD COLUMN usuario text;
-- Recupera un usuario a partir del nombre (sin espacios), para no dejarlo vacío.
UPDATE usuarios SET usuario = regexp_replace(lower(nombre), '\s+', '_', 'g') || '_' || left(id::text, 4);
ALTER TABLE usuarios ALTER COLUMN usuario SET NOT NULL;
CREATE UNIQUE INDEX usuarios_usuario_unico ON usuarios (lower(usuario));

DROP INDEX usuarios_nombre_unico;
