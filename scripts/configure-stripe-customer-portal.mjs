import Stripe from 'stripe';
import { STRIPE_API_VERSION } from '../server/billing.js';

const secretKey = process.env.STRIPE_SECRET_KEY || '';
if (!/^(?:sk|rk)_test_/.test(secretKey)) {
  throw new Error('This command accepts a Stripe test key only.');
}

const stripe = new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });
const policyVersion = 'together-ledger-owner-portal-v1';

function matchesApprovedPolicy(configuration) {
  const features = configuration.features || {};
  return configuration.active
    && configuration.livemode === false
    && features.invoice_history?.enabled === true
    && features.payment_method_update?.enabled === true
    && features.subscription_cancel?.enabled === true
    && features.subscription_cancel?.mode === 'at_period_end'
    && features.subscription_cancel?.proration_behavior === 'none'
    && features.subscription_update?.enabled === false
    && (features.subscription_update?.default_allowed_updates || []).length === 0
    && (!features.subscription_pause || features.subscription_pause.enabled === false)
    && (!features.customer_update || (
      features.customer_update.enabled === false
      && (features.customer_update.allowed_updates || []).length === 0
    ))
    && configuration.login_page?.enabled !== true;
}

const existing = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
let configuration = existing.data.find((candidate) => (
  candidate.metadata?.together_policy === policyVersion && matchesApprovedPolicy(candidate)
));

if (!configuration) {
  configuration = await stripe.billingPortal.configurations.create({
    business_profile: { headline: 'A private shared journey, held with care.' },
    default_return_url: `${process.env.PUBLIC_ORIGIN || 'http://127.0.0.1:4174'}/?billing=portal`,
    features: {
      customer_update: { enabled: false },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: {
        enabled: true,
        mode: 'at_period_end',
        proration_behavior: 'none',
      },
      subscription_update: {
        enabled: false,
        proration_behavior: 'none',
      },
    },
    metadata: {
      together_environment: 'test',
      together_policy: policyVersion,
    },
  }, { idempotencyKey: policyVersion });
}

if (!matchesApprovedPolicy(configuration)) {
  throw new Error('Stripe returned a Customer Portal configuration outside the approved policy.');
}

console.log(JSON.stringify({
  configurationId: configuration.id,
  environment: 'test',
  invoiceHistory: true,
  paymentMethodUpdate: true,
  cancellation: 'at_period_end',
  proration: 'none',
  subscriptionUpdates: false,
}));
