const defaults = {
  attempts: 36,
  delayMs: 5000,
};

function parseArguments(argv) {
  const options = { ...defaults };
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!value || !['--probe-url', '--revision', '--attempts', '--delay-ms'].includes(flag)) {
      throw new Error('Usage: verify-release-probe.mjs --probe-url <https-url> --revision <full-sha> [--attempts <count>] [--delay-ms <milliseconds>]');
    }
    if (flag === '--probe-url') options.probeUrl = value;
    if (flag === '--revision') options.revision = value;
    if (flag === '--attempts') options.attempts = Number(value);
    if (flag === '--delay-ms') options.delayMs = Number(value);
  }
  return options;
}

function requireOptions({ probeUrl, revision, attempts, delayMs }) {
  const origin = new URL(probeUrl);
  if (origin.protocol !== 'https:' || !origin.hostname.endsWith('.workers.dev')) {
    throw new Error('The release probe must use its HTTPS workers.dev URL.');
  }
  if (!/^[0-9a-f]{40}$/i.test(revision || '')) throw new Error('The expected revision must be a full Git commit SHA.');
  if (!Number.isInteger(attempts) || attempts < 1) throw new Error('Attempts must be a positive integer.');
  if (!Number.isInteger(delayMs) || delayMs < 0) throw new Error('Delay must be a non-negative integer.');
  return origin;
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function verifyReleaseProbe(options) {
  const origin = requireOptions(options);
  const probeUrl = new URL(`/verify/${options.revision}`, origin);
  const fetchImpl = options.fetchImpl || fetch;
  let lastError;

  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    try {
      const response = await fetchImpl(probeUrl, {
        headers: { 'cache-control': 'no-cache' },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`Release probe returned HTTP ${response.status}.`);
      const payload = await response.json();
      if (payload.verified !== true || payload.revision !== options.revision) {
        throw new Error('Release probe did not confirm the expected public revision.');
      }
      return { attempt, revision: payload.revision };
    } catch (error) {
      lastError = error;
      if (attempt < options.attempts) await wait(options.delayMs);
    }
  }

  throw new Error(`External release probe did not confirm the expected public state after ${options.attempts} attempt(s): ${lastError.message}`);
}

async function main() {
  const result = await verifyReleaseProbe(parseArguments(process.argv.slice(2)));
  console.log(`✓ external release probe confirms app revision ${result.revision} (attempt ${result.attempt}).`);
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main().catch((error) => {
    console.error(`Release-probe verification failed: ${error.message}`);
    process.exit(1);
  });
}
