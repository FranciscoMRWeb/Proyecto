-- 001_add_optional_coords.sql
-- Adds optional latitud/longitud columns to propiedades (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='propiedades' AND column_name='latitud'
  ) THEN
    ALTER TABLE propiedades ADD COLUMN latitud DECIMAL(10,8);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='propiedades' AND column_name='longitud'
  ) THEN
    ALTER TABLE propiedades ADD COLUMN longitud DECIMAL(11,8);
  END IF;
END$$;

-- Rollback: drop columns if needed (manually run)
-- ALTER TABLE propiedades DROP COLUMN IF EXISTS latitud;
-- ALTER TABLE propiedades DROP COLUMN IF EXISTS longitud;
