CREATE TABLE IF NOT EXISTS billing_customers (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  provider text NOT NULL CHECK (provider IN ('stripe')),
  environment text NOT NULL CHECK (environment IN ('test','live')),
  provider_customer_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, environment),
  UNIQUE (provider, environment, provider_customer_id)
);

CREATE TABLE IF NOT EXISTS billing_checkout_sessions (
  provider_session_id text NOT NULL,
  environment text NOT NULL CHECK (environment IN ('test','live')),
  payer_user_id uuid NOT NULL REFERENCES users(id),
  journey_id uuid NOT NULL REFERENCES journeys(id),
  offer_id text NOT NULL,
  paid_capacity integer NOT NULL CHECK (paid_capacity BETWEEN 1 AND 97),
  mode text NOT NULL CHECK (mode IN ('payment','subscription')),
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (environment, provider_session_id)
);
CREATE INDEX IF NOT EXISTS billing_checkout_sessions_user_idx
  ON billing_checkout_sessions(payer_user_id, environment, updated_at DESC);
CREATE INDEX IF NOT EXISTS billing_checkout_sessions_journey_idx
  ON billing_checkout_sessions(journey_id, environment, updated_at DESC);

CREATE TABLE IF NOT EXISTS billing_subscriptions (
  provider_subscription_id text NOT NULL,
  environment text NOT NULL CHECK (environment IN ('test','live')),
  payer_user_id uuid NOT NULL REFERENCES users(id),
  journey_id uuid NOT NULL REFERENCES journeys(id),
  provider_customer_id text NOT NULL,
  offer_id text NOT NULL,
  paid_capacity integer NOT NULL CHECK (paid_capacity BETWEEN 1 AND 97),
  status text NOT NULL,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at timestamptz,
  latest_invoice_id text,
  provider_event_created_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (environment, provider_subscription_id)
);
CREATE INDEX IF NOT EXISTS billing_subscriptions_user_idx
  ON billing_subscriptions(payer_user_id, environment, updated_at DESC);
CREATE INDEX IF NOT EXISTS billing_subscriptions_journey_idx
  ON billing_subscriptions(journey_id, environment, updated_at DESC);

CREATE TABLE IF NOT EXISTS billing_invoices (
  provider_invoice_id text NOT NULL,
  environment text NOT NULL CHECK (environment IN ('test','live')),
  payer_user_id uuid NOT NULL REFERENCES users(id),
  journey_id uuid NOT NULL REFERENCES journeys(id),
  provider_subscription_id text,
  status text NOT NULL,
  amount_due integer NOT NULL DEFAULT 0,
  amount_paid integer NOT NULL DEFAULT 0,
  currency text NOT NULL,
  hosted_invoice_url text,
  invoice_pdf_url text,
  provider_event_created_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (environment, provider_invoice_id)
);
CREATE INDEX IF NOT EXISTS billing_invoices_user_idx
  ON billing_invoices(payer_user_id, environment, created_at DESC);
CREATE INDEX IF NOT EXISTS billing_invoices_journey_idx
  ON billing_invoices(journey_id, environment, created_at DESC);

CREATE TABLE IF NOT EXISTS billing_entitlements (
  id uuid PRIMARY KEY,
  payer_user_id uuid NOT NULL REFERENCES users(id),
  journey_id uuid NOT NULL REFERENCES journeys(id),
  capability text NOT NULL,
  source text NOT NULL CHECK (source IN ('stripe','apple','google','admin','promotion')),
  environment text NOT NULL CHECK (environment IN ('test','live','sandbox')),
  source_record_id text NOT NULL,
  state text NOT NULL CHECK (state IN ('pending','active','grace','revoked','expired')),
  quantity integer NOT NULL CHECK (quantity BETWEEN 0 AND 97),
  effective_at timestamptz,
  expires_at timestamptz,
  last_verified_at timestamptz NOT NULL,
  provider_event_created_at timestamptz,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, environment, source_record_id, capability)
);
CREATE INDEX IF NOT EXISTS billing_entitlements_user_idx
  ON billing_entitlements(payer_user_id, capability, state, expires_at DESC);
CREATE INDEX IF NOT EXISTS billing_entitlements_journey_idx
  ON billing_entitlements(journey_id, capability, state, expires_at DESC);

CREATE TABLE IF NOT EXISTS billing_webhook_events (
  provider_event_id text NOT NULL,
  environment text NOT NULL CHECK (environment IN ('test','live')),
  event_type text NOT NULL,
  provider_created_at timestamptz,
  processing_state text NOT NULL CHECK (processing_state IN ('processing','processed','failed')),
  attempts integer NOT NULL DEFAULT 1 CHECK (attempts > 0),
  last_error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  PRIMARY KEY (environment, provider_event_id)
);
CREATE INDEX IF NOT EXISTS billing_webhook_events_state_idx
  ON billing_webhook_events(environment, processing_state, received_at);
