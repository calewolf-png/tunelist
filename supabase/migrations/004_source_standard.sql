ALTER TABLE standards
  ADD COLUMN IF NOT EXISTS source_standard_id UUID REFERENCES standards(id) ON DELETE SET NULL;
