import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createAppReleaseProbe } from '../probes/app-release-probe/app-release-probe.mjs';
import { findWorkersDevUrl } from '../scripts/deploy-release-probe.mjs';
import { verifyReleaseProbe } from '../scripts/verify-release-probe.mjs';
import { verifyWorkerRelease } from '../scripts/verify-worker-release.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const revision = 'a'.repeat(40);

test('Worker release verifier proves both revision parity and a visible control', async () => {
  const fetchImpl = async (url) => {
    if (new URL(url).pathname === '/release.json') {
      return new Response(JSON.stringify({ revision }), { status: 200 });
    }
    return new Response('<button>Keep what matters, together.</button>', { status: 200 });
  };
  const result = await verifyWorkerRelease({
    baseUrl: 'https://app.example.test',
    revision,
    requiredText: 'Keep what matters,',
    attempts: 1,
    delayMs: 0,
    fetchImpl,
  });
  assert.equal(result.revision, revision);
});

test('Worker release verifier fails closed when the marker is stale', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ revision: 'b'.repeat(40) }), { status: 200 });
  await assert.rejects(
    verifyWorkerRelease({
      baseUrl: 'https://app.example.test',
      revision,
      requiredText: 'Keep what matters,',
      attempts: 1,
      delayMs: 0,
      fetchImpl,
    }),
    /instead of the expected revision/,
  );
});

test('Worker release verifier allows a transient public marker denial to settle', async () => {
  let markerRequests = 0;
  const fetchImpl = async (url) => {
    if (new URL(url).pathname === '/release.json') {
      markerRequests += 1;
      if (markerRequests === 1) return new Response('Still propagating', { status: 403 });
      return new Response(JSON.stringify({ revision }), { status: 200 });
    }
    return new Response('<button>Keep what matters, together.</button>', { status: 200 });
  };
  const result = await verifyWorkerRelease({
    baseUrl: 'https://app.example.test',
    revision,
    requiredText: 'Keep what matters,',
    attempts: 2,
    delayMs: 0,
    fetchImpl,
  });
  assert.equal(result.attempt, 2);
});

test('external release probe permits only a matching public revision', async () => {
  const probe = createAppReleaseProbe(async (url) => {
    if (new URL(url).pathname === '/release.json') {
      return new Response(JSON.stringify({ revision }), { status: 200 });
    }
    return new Response('<button>Keep what matters, together.</button>', { status: 200 });
  });
  const response = await probe.fetch(new Request(`https://probe.example.test/verify/${revision}`));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { verified: true, revision });
});

test('external release probe fails closed for stale or non-probe requests', async () => {
  const probe = createAppReleaseProbe(async () => new Response(JSON.stringify({ revision: 'b'.repeat(40) }), { status: 200 }));
  const stale = await probe.fetch(new Request(`https://probe.example.test/verify/${revision}`));
  assert.equal(stale.status, 503);
  assert.deepEqual(await stale.json(), { verified: false, revision });
  assert.equal((await probe.fetch(new Request('https://probe.example.test/anything'))).status, 404);
  assert.equal((await probe.fetch(new Request(`https://probe.example.test/verify/${revision}`, { method: 'POST' }))).status, 405);
});

test('release probe verifier retries its public workers.dev endpoint and requires parity', async () => {
  let attempts = 0;
  const result = await verifyReleaseProbe({
    probeUrl: 'https://together-ledger-app-public-release-probe.example.workers.dev',
    revision,
    attempts: 2,
    delayMs: 0,
    fetchImpl: async () => {
      attempts += 1;
      return attempts === 1
        ? new Response('Waiting', { status: 503 })
        : Response.json({ verified: true, revision });
    },
  });
  assert.equal(result.attempt, 2);
  await assert.rejects(
    verifyReleaseProbe({
      probeUrl: 'https://together-ledger-app-public-release-probe.example.workers.dev',
      revision,
      attempts: 1,
      delayMs: 0,
      fetchImpl: async () => Response.json({ verified: true, revision: 'b'.repeat(40) }),
    }),
    /never confirmed revision/,
  );
});

test('the release gate says which question it could not answer', async () => {
  const probeUrl = 'https://together-ledger-app-public-release-probe.example.workers.dev';

  // A probe that never comes up means the release was not checked. That is a different fact
  // from the release being wrong, and every delivery on 18 September reported it as the same.
  await assert.rejects(
    verifyReleaseProbe({
      probeUrl,
      revision,
      attempts: 4,
      readinessAttempts: 2,
      delayMs: 0,
      fetchImpl: async () => new Response('Waiting', { status: 503 }),
    }),
    (error) => {
      assert.equal(error.reason, 'probe-unavailable');
      assert.match(error.message, /never became reachable/);
      assert.match(error.message, /not the same as the release being wrong/);
      return true;
    },
  );

  await assert.rejects(
    verifyReleaseProbe({
      probeUrl,
      revision,
      attempts: 1,
      readinessAttempts: 4,
      delayMs: 0,
      fetchImpl: async () => Response.json({ verified: true, revision: 'b'.repeat(40) }),
    }),
    (error) => {
      assert.equal(error.reason, 'release-unconfirmed');
      return true;
    },
  );
});

test('waiting for the probe does not spend the budget meant for the release', async () => {
  // The workflow deploys the probe and immediately asks it, so the first answers are 5xx from
  // a Worker still rolling out. Those attempts belong to readiness; previously they consumed
  // the revision budget, which is how a healthy release failed its own gate.
  let calls = 0;
  const result = await verifyReleaseProbe({
    probeUrl: 'https://together-ledger-app-public-release-probe.example.workers.dev',
    revision,
    attempts: 1,
    readinessAttempts: 5,
    delayMs: 0,
    fetchImpl: async () => {
      calls += 1;
      return calls <= 3 ? new Response('Waiting', { status: 503 }) : Response.json({ verified: true, revision });
    },
  });
  assert.equal(result.attempt, 4);
});

test('release-probe deployer finds only the fixed public probe URL', () => {
  const output = 'Published together-ledger-app-public-release-probe\nhttps://together-ledger-app-public-release-probe.example.workers.dev\n';
  assert.equal(findWorkersDevUrl(output), 'https://together-ledger-app-public-release-probe.example.workers.dev');
  assert.equal(findWorkersDevUrl('Published without an endpoint'), undefined);
});

test('release delivery workflows keep their explicit protected-main boundaries', () => {
  const pages = readFileSync(join(root, '.github/workflows/pages.yml'), 'utf8');
  const worker = readFileSync(join(root, '.github/workflows/app-worker.yml'), 'utf8');
  assert.match(pages, /actions\/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a/);
  assert.doesNotMatch(pages, /actions\/upload-pages-artifact@/);
  assert.match(worker, /workflow_run:/);
  assert.match(worker, /github\.event\.workflow_run\.conclusion == 'success'/);
  assert.match(worker, /github\.event\.workflow_run\.event == 'push'/);
  assert.match(worker, /name: app/);
  assert.match(worker, /CLOUDFLARE_API_TOKEN/);
  assert.match(worker, /probes\/app-release-probe\/wrangler\.jsonc/);
  // The gate is the runner's own view of the public app, because it is outside Cloudflare and
  // is the closest thing here to what a visitor's browser does. The probe observes alongside
  // it: on 26cf2d1 the runner saw the revision in 52 seconds while the probe said otherwise
  // for 450, so a probe that cannot see the app must not be able to stop a release.
  assert.match(worker, /scripts\/verify-worker-release\.mjs/);
  assert.match(worker, /--base-url "https:\/\/app\.together-ledger\.com"/);
  const probeStep = worker.slice(worker.indexOf('Observe the external release probe'));
  assert.match(probeStep, /continue-on-error: true/);
  const gateStep = worker.slice(worker.indexOf('Verify the public app revision from the runner'), worker.indexOf('Validate external release-probe packaging'));
  assert.doesNotMatch(gateStep, /continue-on-error/);
  assert.match(worker, /deploy-release-probe\.mjs/);
  assert.match(worker, /verify-release-probe\.mjs/);
});

test('the release marker is declared uncacheable at the edge', () => {
  // The edge ignores query strings on this zone, so the probe's ?revision= cache-buster is
  // inert. Without this header the probe reads a stale marker and reports a healthy release
  // as unconfirmed, which is what every delivery on 18 September did.
  const headers = readFileSync(join(root, 'public', '_headers'), 'utf8');
  const marker = headers.slice(headers.indexOf('/release.json'));
  assert.match(marker, /^\/release\.json\s*\n\s+Cache-Control:\s*no-store/m);
});
