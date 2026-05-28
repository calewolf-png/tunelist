-- Add review/edit tracking columns to standard_requests
ALTER TABLE standard_requests
  ADD COLUMN IF NOT EXISTS request_type TEXT NOT NULL DEFAULT 'new_standard'
    CHECK (request_type IN ('new_standard', 'amendment')),
  ADD COLUMN IF NOT EXISTS proposed_changes JSONB,
  ADD COLUMN IF NOT EXISTS ai_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by_ai BOOLEAN NOT NULL DEFAULT false;

-- Allow owners to update their own submitted (not-yet-official) standards.
-- WITH CHECK blocks self-promotion to 'official' — only service role can do that.
CREATE POLICY "standards_update_own_submitted" ON standards
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND submitted_by = auth.uid()
    AND status = 'submitted'
    AND is_official = false
  )
  WITH CHECK (
    submitted_by = auth.uid()
    AND is_official = false
    AND status IN ('submitted', 'pending')
  );

-- Grant update on standards to authenticated users (needed for RLS to take effect)
GRANT UPDATE ON standards TO authenticated;

-- Grant insert/select on standard_requests to authenticated users
GRANT SELECT, INSERT ON standard_requests TO authenticated;
