import { createBillingService } from '../server/billing.js';
import { loadConfig } from '../server/config.js';
import { createPool, runMigrations } from '../server/db.js';

let pool;
try {
  const config = loadConfig();
  if (!config.billingEnabled) throw new Error('Stripe billing must be enabled before reconciliation can run.');
  pool = createPool(config);
  await runMigrations(pool);
  const billing = createBillingService({ pool, config });
  const summary = await billing.reconcile({ trigger: process.argv.includes('--scheduled') ? 'scheduled' : 'manual' });
  process.stdout.write(`${JSON.stringify({ ok: true, ...summary })}\n`);
  if (summary.duplicateCustomers || summary.webhookFailures) process.exitCode = 2;
} catch {
  process.stderr.write(`${JSON.stringify({ ok: false, message: 'Stripe billing reconciliation failed; inspect the private reconciliation ledger.' })}\n`);
  process.exitCode = 1;
} finally {
  await pool?.end();
}
