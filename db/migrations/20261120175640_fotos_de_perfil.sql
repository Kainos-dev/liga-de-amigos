-- migrate:up

-- Fotos de perfil en lugar de emoji + color.
-- La foto llega ya achicada desde el celular (~256x256, unos 20 KB) y se
-- guarda acá mismo: para el tamaño de un grupo de amigos no hace falta un
-- servicio de imágenes aparte. Sin foto, el avatar es la inicial del nombre
-- sobre un color que se calcula a partir del nombre (no se guarda).
ALTER TABLE usuarios
  DROP COLUMN avatar_emoji,
  DROP COLUMN avatar_color,
  ADD COLUMN foto bytea CHECK (octet_length(foto) <= 300000),
  ADD COLUMN foto_tipo text CHECK (foto_tipo IN ('image/jpeg', 'image/png', 'image/webp')),
  -- Cuándo se cambió la foto: va en la dirección de la imagen (?v=...) para
  -- que el navegador la guarde en caché y pida la nueva solo cuando cambia.
  ADD COLUMN foto_actualizada_en timestamptz,
  ADD CHECK ((foto IS NULL) = (foto_tipo IS NULL) AND (foto IS NULL) = (foto_actualizada_en IS NULL));

-- migrate:down

ALTER TABLE usuarios
  DROP COLUMN foto,
  DROP COLUMN foto_tipo,
  DROP COLUMN foto_actualizada_en,
  ADD COLUMN avatar_emoji text NOT NULL DEFAULT '😎',
  ADD COLUMN avatar_color text NOT NULL DEFAULT 'violeta';
