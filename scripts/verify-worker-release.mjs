const defaults = {
  attempts: 12,
  delayMs: 5000,
};

function parseArguments(argv) {
  const options = { ...defaults };
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!value || !['--base-url', '--revision', '--required-text', '--attempts', '--delay-ms'].includes(flag)) {
      throw new Error('Usage: verify-worker-release.mjs --base-url <https-url> --revision <full-sha> --required-text <text> [--attempts <count>] [--delay-ms <milliseconds>]');
    }
    if (flag === '--base-url') options.baseUrl = value;
    if (flag === '--revision') options.revision = value;
    if (flag === '--required-text') options.requiredText = value;
    if (flag === '--attempts') options.attempts = Number(value);
    if (flag === '--delay-ms') options.delayMs = Number(value);
  }
  return options;
}

function requireOptions({ baseUrl, revision, requiredText, attempts, delayMs }) {
  const origin = new URL(baseUrl);
  if (!['http:', 'https:'].includes(origin.protocol)) throw new Error('The release URL must use HTTP or HTTPS.');
  if (!/^[0-9a-f]{40}$/i.test(revision || '')) throw new Error('The expected revision must be a full Git commit SHA.');
  if (!requiredText) throw new Error('A user-visible required text value is required.');
  if (!Number.isInteger(attempts) || attempts < 1) throw new Error('Attempts must be a positive integer.');
  if (!Number.isInteger(delayMs) || delayMs < 0) throw new Error('Delay must be a non-negative integer.');
  return origin;
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchChecked(fetchImpl, url, description) {
  const response = await fetchImpl(url, {
    headers: { 'cache-control': 'no-cache' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`${description} returned HTTP ${response.status}.`);
  return response;
}

export async function verifyWorkerRelease(options) {
  const origin = requireOptions(options);
  const baseUrl = origin.href.endsWith('/') ? origin : new URL(`${origin.href}/`);
  const markerUrl = new URL('release.json', baseUrl);
  markerUrl.searchParams.set('revision', options.revision);
  const homeUrl = new URL('/', baseUrl);
  const fetchImpl = options.fetchImpl || fetch;
  let lastError;

  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    try {
      const marker = await fetchChecked(fetchImpl, markerUrl, 'Release marker');
      const payload = await marker.json();
      if (payload.revision !== options.revision) {
        throw new Error(`Release marker reported ${payload.revision || 'no revision'} instead of the expected revision.`);
      }
      const homepage = await fetchChecked(fetchImpl, homeUrl, 'App homepage');
      if (!(await homepage.text()).includes(options.requiredText)) {
        throw new Error('App homepage is missing the expected user-visible control text.');
      }
      return { attempt, revision: payload.revision };
    } catch (error) {
      lastError = error;
      if (attempt < options.attempts) await wait(options.delayMs);
    }
  }

  throw new Error(`Worker release did not reach the expected public state after ${options.attempts} attempt(s): ${lastError.message}`);
}

async function main() {
  const result = await verifyWorkerRelease(parseArguments(process.argv.slice(2)));
  console.log(`✓ app Worker serves revision ${result.revision} and the required user-visible control (attempt ${result.attempt}).`);
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main().catch((error) => {
    console.error(`Release verification failed: ${error.message}`);
    process.exit(1);
  });
}
