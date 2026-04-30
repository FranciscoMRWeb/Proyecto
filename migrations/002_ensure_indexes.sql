-- 002_ensure_indexes.sql
-- Ensure indexes useful for search exist (idempotent)
CREATE INDEX IF NOT EXISTS idx_propiedades_ciudad_disponible_precio ON propiedades (ciudad, disponible, precio);
CREATE INDEX IF NOT EXISTS idx_propiedad_fotos_propiedad ON propiedad_fotos (propiedad_id, orden);
CREATE INDEX IF NOT EXISTS idx_matches_estado ON matches (estado, contacto_visible);

-- No rollback provided; indexes can be dropped with DROP INDEX IF EXISTS <index_name>;
