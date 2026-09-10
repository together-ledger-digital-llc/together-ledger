CREATE TABLE IF NOT EXISTS moment_location_slots (
  id uuid PRIMARY KEY,
  journey_id uuid NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  moment_id uuid NOT NULL REFERENCES journey_moments(id) ON DELETE CASCADE,
  payer_user_id uuid NOT NULL REFERENCES users(id),
  environment text NOT NULL CHECK (environment = 'test'),
  provider_session_id text,
  provider_subscription_id text,
  state text NOT NULL CHECK (state IN ('pending','active','grace','expired','canceled')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (environment, provider_session_id), UNIQUE (environment, provider_subscription_id)
);

ALTER TABLE journey_moments
  ADD COLUMN IF NOT EXISTS location_billing_baseline integer NOT NULL DEFAULT 1;

UPDATE journey_moments
SET location_billing_baseline = GREATEST(1, jsonb_array_length(locations));
