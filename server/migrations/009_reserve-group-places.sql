ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS reservation_active boolean NOT NULL DEFAULT true;

UPDATE invitations
SET reservation_active=false
WHERE accepted_at IS NOT NULL OR revoked_at IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS invitations_one_live_email_idx
  ON invitations(journey_id,email_normalized)
  WHERE reservation_active;
