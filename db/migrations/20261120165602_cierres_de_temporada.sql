-- migrate:up

-- Foto congelada de una temporada al cerrarla: la tabla final y el resumen
-- anual tal como estaban. Después del cierre se muestran desde acá, así los
-- resultados no cambian aunque alguien se vaya del grupo o se renombre una acción.
CREATE TABLE cierres_temporada (
  temporada_id  uuid PRIMARY KEY REFERENCES temporadas (id) ON DELETE CASCADE,
  grupo_id      uuid NOT NULL REFERENCES grupos (id) ON DELETE CASCADE,
  tabla         jsonb NOT NULL,
  resumen       jsonb NOT NULL,
  cerrada_por   uuid REFERENCES usuarios (id) ON DELETE SET NULL,
  creado_en     timestamptz NOT NULL DEFAULT now()
);

-- migrate:down

DROP TABLE cierres_temporada;
