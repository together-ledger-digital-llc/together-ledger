CREATE TABLE IF NOT EXISTS billing_reconciliation_runs (
  id uuid PRIMARY KEY,
  provider text NOT NULL CHECK (provider IN ('stripe')),
  environment text NOT NULL CHECK (environment IN ('test','live')),
  run_trigger text NOT NULL CHECK (run_trigger IN ('manual','scheduled')),
  processing_state text NOT NULL CHECK (processing_state IN ('running','succeeded','failed')),
  customers_scanned integer NOT NULL DEFAULT 0 CHECK (customers_scanned >= 0),
  subscriptions_scanned integer NOT NULL DEFAULT 0 CHECK (subscriptions_scanned >= 0),
  invoices_scanned integer NOT NULL DEFAULT 0 CHECK (invoices_scanned >= 0),
  entitlement_drift_repaired integer NOT NULL DEFAULT 0 CHECK (entitlement_drift_repaired >= 0),
  duplicate_customers integer NOT NULL DEFAULT 0 CHECK (duplicate_customers >= 0),
  webhook_failures integer NOT NULL DEFAULT 0 CHECK (webhook_failures >= 0),
  last_error text,
  started_at timestamptz NOT NULL,
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS billing_reconciliation_runs_recent_idx
  ON billing_reconciliation_runs(provider,environment,started_at DESC);
