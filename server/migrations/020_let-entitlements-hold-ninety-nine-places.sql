ALTER TABLE billing_entitlements DROP CONSTRAINT IF EXISTS billing_entitlements_quantity_check;
ALTER TABLE billing_entitlements ADD CONSTRAINT billing_entitlements_quantity_check CHECK (quantity BETWEEN 0 AND 99);
