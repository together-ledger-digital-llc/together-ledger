import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
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
  assert.match(worker, /verify-worker-release\.mjs/);
});
