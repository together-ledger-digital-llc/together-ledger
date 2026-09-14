import { appendFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

const workerName = 'together-ledger-app-public-release-probe';

export function findWorkersDevUrl(output) {
  const pattern = new RegExp(`https://${workerName.replaceAll('-', '\\-')}\\.[a-z0-9-]+\\.workers\\.dev`, 'ig');
  const matches = output.match(pattern) || [];
  return matches.at(-1);
}

function runWrangler(revision) {
  return new Promise((resolve, reject) => {
    const child = spawn('./node_modules/.bin/wrangler', [
      'deploy',
      '--config',
      'probes/app-release-probe/wrangler.jsonc',
      '--keep-vars',
      '--message',
      `Public app verification probe ${revision}`,
    ], { env: process.env });
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on('data', (chunk) => {
      output += chunk;
      process.stderr.write(chunk);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(`Wrangler exited with status ${code}.`));
    });
  });
}

async function main() {
  const revision = process.env.TOGETHER_LEDGER_RELEASE_REVISION;
  if (!/^[0-9a-f]{40}$/i.test(revision || '')) throw new Error('A full reviewed commit SHA is required.');
  const output = await runWrangler(revision);
  const url = findWorkersDevUrl(output);
  if (!url) throw new Error('Wrangler did not report the public release-probe URL.');
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `url=${url}\n`);
  console.log(`Public release probe: ${url}`);
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main().catch((error) => {
    console.error(`Release-probe deployment failed: ${error.message}`);
    process.exit(1);
  });
}
