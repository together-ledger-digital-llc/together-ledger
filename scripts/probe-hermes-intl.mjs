// Runs scripts/intl-probe.entry.js under a Hermes binary and prints what Intl did, language by
// language (docs/TRANSLATION.md, "Intl on the phone"):
//
//   HERMES=/path/to/hermes node scripts/probe-hermes-intl.mjs
//
// The binary is the Hermes React Native ships (react-native/sdks/hermes-engine/version.properties
// names it), built from source with Intl: cmake -DHERMES_ENABLE_INTL=ON, then ninja hermes. On
// Linux its Intl.NumberFormat is a stub that prints the number as C does, so numbers are only
// meaningful from a phone; plurals, the polyfills and dates are the engine's own.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));

/** The probe as one script, preceded by prelude (code run before anything else). */
export async function probeBundle(prelude = '') {
  const result = await build({
    entryPoints: [join(root, 'scripts/intl-probe.entry.js')],
    bundle: true,
    format: 'iife',
    target: ['es2020'],
    platform: 'neutral',
    mainFields: ['module', 'main'],
    banner: { js: prelude },
    write: false,
    logLevel: 'silent',
  });
  return result.outputFiles[0].text;
}

/** Runs the probe with executable (node or hermes) and returns what it found. */
export async function runProbe(executable, prelude = '') {
  const directory = mkdtempSync(join(tmpdir(), 'intl-probe-'));
  try {
    const script = join(directory, 'probe.js');
    writeFileSync(script, await probeBundle(prelude));
    return JSON.parse(execFileSync(executable, [script], { encoding: 'utf8' }));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.env.HERMES) {
    console.error('Set HERMES to a Hermes binary built with Intl (see this file\'s header).');
    process.exit(1);
  }
  console.log(JSON.stringify(await runProbe(process.env.HERMES), null, 2));
}
