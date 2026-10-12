-- The Language preference (prompt 101B). language is the language a person chose by hand, as a
-- tag from locales/languages.json ('hi', 'bn', 'es-419', 'hi-Latn', 'en'). NULL is "Follow my
-- device": no choice made, so the web and the phone keep following the browser's or the phone's
-- own languages, and keep following them when those change. Choosing English is 'en', which is
-- not the same as NULL: it stays English on a phone that moves to Hindi.
--
-- Server error messages and emails stay English in v1. The preference is kept on the account so
-- they can follow it later. Which tags are accepted is the server's rule (only a language the
-- manifest marks approved), not this column's, so approving a language needs no migration; the
-- check here is only a backstop on size. Additive: one nullable column, and every existing
-- account follows its device, as it always has. The release before this one runs against it
-- unchanged.
ALTER TABLE users ADD COLUMN IF NOT EXISTS language text;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_language_check;
ALTER TABLE users ADD CONSTRAINT users_language_check CHECK (language IS NULL OR char_length(language) BETWEEN 2 AND 35);
