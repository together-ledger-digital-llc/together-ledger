ALTER TABLE journey_moments
  ADD COLUMN IF NOT EXISTS theme text;

ALTER TABLE journey_moments
  DROP CONSTRAINT IF EXISTS journey_moments_theme_check;

ALTER TABLE journey_moments
  ADD CONSTRAINT journey_moments_theme_check
  CHECK (theme IS NULL OR theme IN ('light','dark','green','rose-pine','flexoki','tokyo-night-day'));

ALTER TABLE private_moment_events
  DROP CONSTRAINT IF EXISTS private_moment_events_action_check;

ALTER TABLE private_moment_events
  DROP CONSTRAINT IF EXISTS private_moment_events_constraint_1;

ALTER TABLE private_moment_events
  ADD CONSTRAINT private_moment_events_action_check
  CHECK (action IN ('moment_added','moment_updated','visibility_changed','moment_theme_changed','moment_deleted'));

ALTER TABLE private_moment_events
  ADD COLUMN IF NOT EXISTS before_theme text,
  ADD COLUMN IF NOT EXISTS after_theme text;

ALTER TABLE private_moment_events
  DROP CONSTRAINT IF EXISTS private_moment_events_before_theme_check;

ALTER TABLE private_moment_events
  ADD CONSTRAINT private_moment_events_before_theme_check
  CHECK (before_theme IS NULL OR before_theme IN ('light','dark','green','rose-pine','flexoki','tokyo-night-day'));

ALTER TABLE private_moment_events
  DROP CONSTRAINT IF EXISTS private_moment_events_after_theme_check;

ALTER TABLE private_moment_events
  ADD CONSTRAINT private_moment_events_after_theme_check
  CHECK (after_theme IS NULL OR after_theme IN ('light','dark','green','rose-pine','flexoki','tokyo-night-day'));
