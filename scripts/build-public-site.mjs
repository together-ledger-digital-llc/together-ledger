import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, '_site');
const releaseRevision = (process.env.TOGETHER_LEDGER_RELEASE_REVISION || 'local-development').trim();
const publicFiles = [
  'index.html',
  'src/api.js',
  'src/app.js',
  'src/model.js',
  'src/moment-themes.js',
  'src/store.js',
  'src/styles.css',
  'src/themes.js',
];

if (releaseRevision !== 'local-development' && !/^[0-9a-f]{40}$/i.test(releaseRevision)) {
  throw new Error('TOGETHER_LEDGER_RELEASE_REVISION must be a full Git commit SHA or local-development.');
}

rmSync(output, { force: true, recursive: true });
mkdirSync(join(output, 'src'), { recursive: true });

for (const relativePath of publicFiles) {
  cpSync(join(root, relativePath), join(output, relativePath));
}
cpSync(join(root, 'public'), output, { recursive: true });
writeFileSync(join(output, 'release.json'), `${JSON.stringify({ revision: releaseRevision }, null, 2)}\n`);

console.log(`Assembled ${publicFiles.length} app files, public assets, and release marker ${releaseRevision} in _site/.`);
