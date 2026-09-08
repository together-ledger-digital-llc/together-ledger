# Stripe web billing

Together Ledger uses Stripe only for purchases made directly on the web. Stripe-hosted Checkout collects payment details and Stripe Billing owns recurring invoices and recovery. Together Ledger stores no card details. Customer Portal remains unavailable until its policies and permissions are approved.

This integration is test-mode code, not a live billing launch. The approved test offer is $1 USD per additional person each month, with the first two people in a journey included and one combined subscription and invoice per paid journey. Public release, tax registrations, refund policy, grace policy, Portal permissions, and mobile-store policy review remain gated decisions.

## Purchase boundary

```text
Together Ledger web                 iOS / future Android
───────────────────                 ─────────────────────
Stripe Checkout                     Apple / Google purchase system
       │                                      │
Stripe webhooks                    verified store notifications
       └──────────────┬───────────────────────┘
                      ▼
        provider-neutral entitlement ledger
```

Apple and Google transactions must never be recreated as Stripe charges. Native applications must use the applicable store purchase system unless a separately reviewed storefront rule permits another path. Cross-platform sign-in may recognize a verified entitlement, but each payment provider remains authoritative for its own transaction.

## What is implemented

- Owner-only, CSRF-protected Checkout Session creation for one server allow-listed $1 USD monthly additional-person Stripe Price.
- One subscription per paid journey, fixed at one additional person in this candidate; broader quantity policy remains in issue 43.
- Stable idempotency keys derived from a client request UUID and internal account ID.
- Reused Stripe Customers, linked to internal accounts without exposing Customer or Price IDs to the browser.
- No Customer Portal route or browser action in this candidate.
- Raw-body Stripe webhook signature verification.
- A hard test/live boundary: a test-configured service accepts only test keys and rejects live-mode webhook events before persistence.
- Idempotent webhook records with bounded retry state.
- Provider event times prevent delayed subscription and invoice deliveries from restoring older payment state; the latest stored subscription quantity remains authoritative when invoice metadata is stale.
- Journey-scoped subscription, invoice, and provider-neutral capacity-entitlement records.
- A seven-day recovery grace period by default, configurable before launch.
- A signed-in journey-owner surface that clearly labels test mode, says “another person” rather than “seat,” and sends the person only to validated Stripe-hosted domains.
- Duplicate active subscriptions for the same journey are blocked, and account deletion waits until any paid or owned journey subscription has ended so deleting a login cannot leave an unseen renewal behind.
- Failed payment never removes a person or destroys shared history; it changes only paid-capacity state and blocks future expansion once the recovery policy requires it.

Webhook processing is deliberately limited to local database work so the endpoint can respond promptly. The initial adapter records all verified event types and projects Checkout, subscription, and invoice events into billing state. Refund, dispute, credit-note, and cross-provider reconciliation policies remain release work.

## Test-mode setup

1. Rotate any test secret that has appeared in chat, screenshots, logs, or shell history. Create a new test or restricted test key with only the access this integration needs.
2. In Stripe test mode, create one consumer software Product and one recurring Price: $1.00 USD per month, licensed quantity. Keep commercially used Prices immutable; create a new Price for a later pricing change.
3. Customer Portal configuration is not required for the Checkout-and-webhook acceptance gate. Keep the Portal action unavailable until cancellation, upgrade, downgrade, proration, and promotion-code choices have written approval.
4. Create a test-mode webhook endpoint at `https://api.together-ledger.com/api/v1/billing/webhooks/stripe`, or forward locally with the Stripe CLI. Each new `stripe listen` process creates its own signing secret, so update the local ignored environment value before starting the application:

   ```bash
   stripe listen --forward-to http://127.0.0.1:4174/api/v1/billing/webhooks/stripe
   ```

5. Subscribe the endpoint to these initial events:

   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.finalized`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `charge.dispute.created`
   - `charge.dispute.closed`
   - `credit_note.created`

6. Put rotated values only in an ignored local environment file or managed secret store:

   ```dotenv
   BILLING_ENABLED=true
   STRIPE_ENVIRONMENT=test
   STRIPE_SECRET_KEY=<rotated-test-secret>
   STRIPE_WEBHOOK_SECRET=<test-webhook-signing-secret>
   STRIPE_ADDITIONAL_PERSON_PRICE_ID=<test-additional-person-monthly-price-id>
   STRIPE_TAX_ENABLED=false
   BILLING_GRACE_DAYS=7
   ```

7. Run `npm run check`, start the service, create and verify a synthetic journey-owner account, and open Account settings on a hosted journey. The billing panel must say **Test mode** and **$1 USD / month** before Checkout opens.

## Webhook authority

The Checkout success redirect is informational. It never grants access. Verified Stripe webhooks update the internal entitlement ledger, and application access reads that ledger.

`invoice.paid` confirms a settled renewal. Subscription events carry current status, cancellation timing, and period boundaries. Duplicate delivery is normal, and event ordering is not trusted. The aggregate-only operator reconciliation in [STRIPE_RECONCILIATION.md](STRIPE_RECONCILIATION.md) repairs current Stripe state after missed or out-of-order delivery; its protected production schedule must still be operating before live launch.

## Minimum release tests

- Successful and abandoned Checkout.
- Declines and required authentication.
- Duplicate, delayed, and out-of-order webhooks.
- Renewal, failed renewal, grace, and terminal cancellation with Billing Test Clocks.
- Portal cancellation and payment-method update.
- Refund, dispute, and credit-note policy behavior.
- Test webhook delivery to a test endpoint; live events must be rejected.
- Account deletion with retained, pseudonymized financial history.
- Apple and Google sandbox entitlement overlap without creating Stripe charges.

## Decisions still required

- Countries and localized pricing beyond the approved $1 USD monthly test offer.
- Consumer digital-software tax code, registrations, evidence, and filing process.
- Trial, refund, dispute, recovery, and access-grace policies.
- A complete paid-capacity acceptance pass that proves the implemented 3–99 person invitation gate against real test-mode entitlement changes.
- Portal upgrade, downgrade, cancellation, proration, and promotion settings.
- Apple App Store and Google Play storefront rules for sign-in, cross-platform access, and any app-to-web steering.
- A protected reconciliation schedule and operational alerts using the implemented operator command.

Relevant Stripe guidance: [Checkout](https://docs.stripe.com/payments/checkout), [subscriptions](https://docs.stripe.com/billing/subscriptions/designing-integration), [Customer Portal](https://docs.stripe.com/customer-management/integrate-customer-portal), [webhooks](https://docs.stripe.com/webhooks), [Invoicing](https://docs.stripe.com/invoicing/integration), [mobile digital goods](https://docs.stripe.com/mobile/digital-goods/checkout), and [go-live checklist](https://docs.stripe.com/get-started/checklist/go-live).
