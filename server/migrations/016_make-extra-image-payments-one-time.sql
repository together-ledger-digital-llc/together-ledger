ALTER TABLE moment_image_slots ADD COLUMN IF NOT EXISTS provider_payment_id text;
ALTER TABLE moment_image_slots ADD COLUMN IF NOT EXISTS used_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS moment_image_slots_payment_idx ON moment_image_slots(environment, provider_payment_id) WHERE provider_payment_id IS NOT NULL;
