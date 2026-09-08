import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../server/config.js';

test('synthetic group capacity cannot be enabled in production', () => {
  assert.throws(() => loadConfig({
    NODE_ENV: 'production',
    JOURNEY_CAPACITY_MODE: 'test-groups',
  }), /Synthetic group capacity cannot be enabled in production/);
});

test('billing-backed capacity cannot run while billing is disabled', () => {
  assert.throws(() => loadConfig({
    NODE_ENV: 'development',
    JOURNEY_CAPACITY_MODE: 'billing',
    BILLING_ENABLED: 'false',
  }), /Billing-backed journey capacity requires Stripe billing to be enabled/);
});

test('two-person capacity remains the default', () => {
  const config = loadConfig({ NODE_ENV: 'test' });
  assert.equal(config.journeyCapacityMode, 'two-person');
  assert.equal(config.billingEnabled, false);
});
