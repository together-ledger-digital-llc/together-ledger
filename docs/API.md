# First-party platform API

All endpoints are versioned under `/api/v1`. JSON responses use `{ "data": ... }` for success and `{ "error": { "code", "message" } }` for failure. Authenticated mutations require the `x-together-csrf` header returned by `GET /api/v1/session`.

## Authentication and account lifecycle

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | Create an account with a unique private username and opaque server session. |
| POST | `/auth/verify-email` | Consume the single-use email-verification token. |
| POST | `/auth/resend-verification` | Revoke an older unused verification token and send a replacement. |
| POST | `/auth/login` | Verify a private username or email plus Argon2id password, then rotate the session. |
| POST | `/auth/logout` | Revoke the current session. |
| GET | `/session` | Return the current account and session CSRF token. |
| POST | `/recovery/request` | Queue a single-use recovery link without account enumeration. |
| POST | `/recovery/confirm` | Consume the token, replace the password, and revoke every session. |
| DELETE | `/account` | Reconfirm the password and permanently delete/pseudonymize the account. |

## Journeys, members, and sync

| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/journeys` | List authorized journeys or create one. |
| PATCH | `/journeys/:journeyId` | Version-check and update journey details. |
| POST | `/journeys/:journeyId/invitations` | Owner creates a hashed, expiring invitation token. |
| POST | `/invitations/:token/accept` | Authenticated matching account accepts one reserved place. |
| DELETE | `/journeys/:journeyId/members/:userId` | Owner removes a member; the removed member cannot be the owner. |
| POST | `/journeys/:journeyId/ownership` | Owner deliberately transfers the journey to another active member. A non-terminal web subscription blocks transfer until its billing relationship is resolved. |
| GET | `/journeys/:journeyId/snapshot?after=0` | Return authorized state, membership join times, invitation history without tokens, current capacity availability, and ordered events after a sequence cursor. A full snapshot includes `eventChainValid`. Capacity reports people, live reservations, whether another invitation is allowed, and the active mode; it does not expose the internal ceiling. |

An unexpired invitation reserves its own place. Creating or accepting an invitation takes the journey lock so concurrent requests cannot exceed capacity. The default and production-safe mode remains two-person. `test-groups` permits synthetic 3–99 person verification outside production only; `billing` requires billing to be explicitly enabled and derives additional capacity from the current journey entitlement.

## Journey records

| Method | Path | Purpose |
|---|---|---|
| POST/PATCH/DELETE | `/journeys/:journeyId/expenses[/expenseId]` | Create, version-check, edit, or tombstone an expense. |
| POST/PATCH/DELETE | `/journeys/:journeyId/concerns[/concernId]` | Create, version-check, edit, or tombstone a concern. |
| POST/PATCH/DELETE | `/journeys/:journeyId/moments[/momentId]` | Create or mutate a private, shared-now, or share-later moment with creator-aware authorization. |
| PATCH | `/journeys/:journeyId/milestones/:key` | Set a bounded action milestone. |
| GET | `/journeys/:journeyId/events?after=0` | Read the authoritative event stream. |

## Web billing

Stripe billing is disabled unless the server has an explicit, mode-matched configuration. Checkout and Customer Portal Session creation require an authenticated, verified journey owner, an allowed browser origin, and the session CSRF token. Portal Sessions also require a separately enabled, allow-listed Stripe configuration that passes the approved-policy check on every request.

| Method | Path | Purpose |
|---|---|---|
| GET | `/journeys/:journeyId/billing` | For the journey owner, return the approved additional-person offer, current paid-capacity entitlement, subscription state, and recent journey invoices. Provider Customer and Price IDs are never returned. |
| POST | `/journeys/:journeyId/billing/checkout-sessions` | Create Stripe-hosted subscription Checkout for the allow-listed $1 USD monthly additional-person Price. This candidate accepts only `paidCapacity: 1`; browser-supplied amounts, other quantities, and Price IDs are rejected. |
| POST | `/journeys/:journeyId/billing/portal-sessions` | For the verified journey owner with the mapped Customer and non-terminal journey subscription, create a Stripe-hosted Portal Session. The server first verifies that the allow-listed configuration permits invoice history, payment-method updates, and cancel-at-renewal only. |
| POST | `/billing/webhooks/stripe` | Verify Stripe's signature over the raw body, reject the wrong environment, and idempotently project supported events into billing records and entitlements. This route uses Stripe authentication rather than a browser session. |

The Checkout success redirect never grants access. Verified provider events update the entitlement ledger. See [STRIPE.md](STRIPE.md) for setup, event coverage, and remaining release boundaries.

Account deletion returns `409 billing_subscription_active` while the person pays for, or owns a journey with, a non-terminal web subscription. The billing relationship must be resolved before deletion; the service never silently leaves a recurring charge behind. Portal cancellation takes effect at renewal and does not remove an existing person, shared history, or a valid invitation reservation.

## Conflict contract

Mutable resources carry an integer `version`. A client PATCH or DELETE supplies the version it last read. A mismatch returns `409 conflict`. The client refreshes the authoritative snapshot before a person retries; silent last-write-wins is prohibited.

Moment visibility accepts `private`, `shared-now`, or `share-later`. Private and share-later records are returned and mutable only for their creator. Either creator-only state may become shared now; shared-now cannot return to a private state because access already granted cannot be revoked retroactively.

## Email adapter

Automated tests use an in-memory outbox. The deployed provider is Resend SMTP, supplied through the provider-neutral Nodemailer SMTP adapter so another relay can be adopted only after independent testing. Raw verification, invitation, and recovery tokens may appear only in the mail adapter invocation and destination message; only their SHA-256 hashes are stored and application logs must never contain them.
