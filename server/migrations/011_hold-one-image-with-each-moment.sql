CREATE TABLE IF NOT EXISTS moment_images (
  id uuid PRIMARY KEY,
  journey_id uuid NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  moment_id uuid NOT NULL REFERENCES journey_moments(id) ON DELETE CASCADE,
  uploaded_by_user_id uuid NOT NULL REFERENCES users(id),
  content_type text NOT NULL CHECK (content_type IN ('image/jpeg','image/png','image/webp')),
  content_length integer NOT NULL CHECK (content_length BETWEEN 1 AND 26214400),
  bytes bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS moment_images_moment_idx ON moment_images(moment_id, created_at, id);
