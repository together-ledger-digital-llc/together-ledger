ALTER TABLE moment_images ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS moment_images_removed_idx ON moment_images(moment_id, deleted_at DESC) WHERE deleted_at IS NOT NULL;
