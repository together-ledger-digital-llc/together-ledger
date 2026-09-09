ALTER TABLE moment_images
  ADD COLUMN IF NOT EXISTS original_filename text NOT NULL DEFAULT 'Image';

ALTER TABLE moment_images
  ADD CONSTRAINT moment_images_original_filename_length
  CHECK (char_length(original_filename) BETWEEN 1 AND 160);
