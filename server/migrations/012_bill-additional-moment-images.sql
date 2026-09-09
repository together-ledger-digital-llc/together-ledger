CREATE TABLE IF NOT EXISTS moment_image_slots (
  id uuid PRIMARY KEY,
  journey_id uuid NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  moment_id uuid NOT NULL REFERENCES journey_moments(id) ON DELETE CASCADE,
  payer_user_id uuid NOT NULL REFERENCES users(id),
  environment text NOT NULL CHECK (environment IN ('test','live')),
  provider_session_id text,
  provider_subscription_id text,
  state text NOT NULL CHECK (state IN ('pending','active','grace','expired','canceled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (environment, provider_session_id),
  UNIQUE (environment, provider_subscription_id)
);
ALTER TABLE moment_images ADD COLUMN IF NOT EXISTS paid_slot_id uuid REFERENCES moment_image_slots(id);
CREATE UNIQUE INDEX IF NOT EXISTS moment_images_paid_slot_idx ON moment_images(paid_slot_id) WHERE paid_slot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS moment_image_slots_moment_idx ON moment_image_slots(moment_id, state, updated_at DESC);
