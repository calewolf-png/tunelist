-- Fix known non-standard modal/suspended values
UPDATE standards SET original_key = 'D minor'  WHERE original_key = 'D dorian';
UPDATE standards SET original_key = 'D major'  WHERE original_key = 'D suspended';

-- Promote bare root notes to major (e.g. "Eb" → "Eb major")
UPDATE standards
SET original_key = original_key || ' major'
WHERE original_key IN ('C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B');

-- NULL out anything still non-conforming so the CHECK below can be added
UPDATE standards
SET original_key = NULL
WHERE original_key IS NOT NULL
  AND original_key NOT IN (
    'C major','C minor','Db major','Db minor','D major','D minor',
    'Eb major','Eb minor','E major','E minor','F major','F minor',
    'F# major','F# minor','G major','G minor','Ab major','Ab minor',
    'A major','A minor','Bb major','Bb minor','B major','B minor'
  );

ALTER TABLE standards
  ADD CONSTRAINT standards_original_key_check
  CHECK (original_key IS NULL OR original_key IN (
    'C major','C minor','Db major','Db minor','D major','D minor',
    'Eb major','Eb minor','E major','E minor','F major','F minor',
    'F# major','F# minor','G major','G minor','Ab major','Ab minor',
    'A major','A minor','Bb major','Bb minor','B major','B minor'
  ));
