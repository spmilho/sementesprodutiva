
ALTER TABLE plano_acoes
  ADD COLUMN IF NOT EXISTS impacto TEXT DEFAULT 'medio',
  ADD COLUMN IF NOT EXISTS esforco TEXT DEFAULT 'medio';

UPDATE plano_acoes SET impacto = 'medio' WHERE impacto IS NULL;
UPDATE plano_acoes SET esforco = 'medio' WHERE esforco IS NULL;
