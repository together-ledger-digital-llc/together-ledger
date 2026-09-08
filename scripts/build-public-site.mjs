import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, '_site');
const publicFiles = [
  'index.html',
  'src/api.js',
  'src/app.js',
  'src/model.js',
  'src/store.js',
  'src/styles.css',
  'src/themes.js',
];

rmSync(output, { force: true, recursive: true });
mkdirSync(join(output, 'src'), { recursive: true });

for (const relativePath of publicFiles) {
  cpSync(join(root, relativePath), join(output, relativePath));
}
cpSync(join(root, 'public'), output, { recursive: true });

console.log(`Assembled ${publicFiles.length} app files and public assets in _site/.`);
