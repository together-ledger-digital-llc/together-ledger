// The web has no bundler, so it loads FormatJS's IntlMessageFormat from one file in the repo,
// src/vendor/intl-messageformat.js, made here from the version in package-lock.json. The phone
// imports the same package from node_modules instead. See docs/TRANSLATION.md.
//
//   node scripts/vendor-intl-messageformat.mjs          rewrite the file
//   node scripts/vendor-intl-messageformat.mjs --check  fail if it is not what this makes
//
// It is bundled down to ES2020 rather than copied: the package's own bundle uses class static
// blocks, which Safari only reads from 16.4, and a module that does not parse stops the whole page.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
export const VENDORED = `${root}src/vendor/intl-messageformat.js`;
const BUNDLED = ['intl-messageformat', '@formatjs/icu-messageformat-parser', '@formatjs/icu-skeleton-parser', '@formatjs/fast-memoize'];

const packageOf = (name) => JSON.parse(readFileSync(`${root}node_modules/${name}/package.json`, 'utf8'));

export async function vendoredSource() {
  const packages = BUNDLED.map(packageOf);
  const license = readFileSync(`${root}node_modules/intl-messageformat/LICENSE.md`, 'utf8').trim();
  const banner = [
    '/*',
    ' * Bundled by scripts/vendor-intl-messageformat.mjs. Do not edit: run that script instead.',
    ...packages.map(({ name, version, license: id }) => ` * ${name} ${version} (${id})`),
    ' * https://github.com/formatjs/formatjs',
    ' *',
    ...license.split('\n').map((line) => ` * ${line}`.trimEnd()),
    ' */',
  ].join('\n');
  const result = await build({
    stdin: { contents: "export { IntlMessageFormat } from 'intl-messageformat';", resolveDir: root, loader: 'js' },
    bundle: true,
    format: 'esm',
    target: ['es2020'],
    platform: 'browser',
    legalComments: 'none',
    // Not minified: its table of regions' hour cycles holds two region codes that, on one line,
    // match a pair of initials check-public-safety.mjs forbids. Unminified, each has its own line.
    minify: false,
    banner: { js: banner },
    metafile: true,
    write: false,
  });
  // The banner names what is inside, so a new dependency of intl-messageformat must be named too.
  const inside = new Set(Object.keys(result.metafile.inputs).map((path) => path.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/)?.[1]).filter(Boolean));
  const unnamed = [...inside].filter((name) => !BUNDLED.includes(name));
  if (unnamed.length) throw new Error(`The bundle now includes ${unnamed.join(', ')}: add it to BUNDLED so its licence is named.`);
  return result.outputFiles[0].text;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const source = await vendoredSource();
  if (process.argv.includes('--check')) {
    if (readFileSync(VENDORED, 'utf8') !== source) {
      console.error('src/vendor/intl-messageformat.js is not what the installed intl-messageformat makes. Run node scripts/vendor-intl-messageformat.mjs.');
      process.exit(1);
    }
    console.log('src/vendor/intl-messageformat.js matches the installed intl-messageformat.');
  } else {
    writeFileSync(VENDORED, source);
    console.log(`Wrote src/vendor/intl-messageformat.js (${source.length} bytes).`);
  }
}
