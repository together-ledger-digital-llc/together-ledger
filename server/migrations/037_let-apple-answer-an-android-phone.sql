-- Sign in with Apple on Android (#400). Android has no Apple sheet, so the phone opens Apple's own
-- page in the system's browser tab, and Apple posts its answer (an ID token, a one-time code, and
-- the name on a first sign-in) to the server's Return URL, not to the phone. The answer waits here
-- until the phone that asked collects it, and no longer than ten minutes.
--
-- state is what Apple echoes back: the SHA-256 of a secret only that phone holds, so only that
-- phone can collect the row, and only once (it is deleted as it is read). answer is the whole of
-- Apple's answer, encrypted with the same key as Apple's refresh tokens (server/apple.js), or
-- null when Apple's answer could not be accepted, so the phone is told rather than left waiting.
-- There is deliberately no user_id: no account has been chosen yet when a row is written.
CREATE TABLE IF NOT EXISTS apple_returns (
  state text PRIMARY KEY,
  answer text,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS apple_returns_created_idx ON apple_returns(created_at);
