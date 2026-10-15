import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { appSiteAssociationProblems, APP_SITE_ASSOCIATION, ASSET_LINKS, assetLinksProblems } from './app-links.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { renderPrivacyPage, renderSupportPage, renderTermsPage } from './render-privacy-page.mjs';
import { choosableLanguages } from '../src/i18n/catalog.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
// _site unless told otherwise; tests/app-links.test.js assembles into a folder of its own.
const outIndex = process.argv.indexOf('--out');
const output = outIndex > 0 && process.argv[outIndex + 1] ? resolve(process.argv[outIndex + 1]) : join(root, '_site');
const releaseRevision = (process.env.TOGETHER_LEDGER_RELEASE_REVISION || 'local-development').trim();
const publicFiles = [
  'index.html',
  'src/a11y/show-password/show-password.js',
  'src/api.js',
  'src/app.js',
  'src/display-text.js',
  // The serif, Gelasio, in Regular, Italic and Bold, Latin only, and its licence.
  'src/fonts/OFL-Gelasio.txt',
  'src/fonts/gelasio-bold-latin.woff2',
  'src/fonts/gelasio-italic-latin.woff2',
  'src/fonts/gelasio-latin.woff2',
  // The Hindi and Bengali serif, fetched by src/styles.css only for those scripts, and its licence.
  'src/fonts/OFL-Tiro.txt',
  'src/fonts/tiro-bangla-bengali.woff2',
  'src/fonts/tiro-devanagari-hindi-devanagari.woff2',
  'src/history-guide.js',
  'src/i18n/catalog.js',
  'src/i18n/dom.js',
  'src/i18n/format.js',
  'src/i18n/language-choice.js',
  'src/i18n/translator.js',
  'src/i18n/web.js',
  'src/journey-row.js',
  'src/leave-journey.js',
  'src/model.js',
  'src/moment-themes.js',
  'src/photo-metadata.js',
  'src/store.js',
  'src/styles.css',
  'src/themes.js',
  'src/vendor/intl-messageformat.js',
  // The sentences, read by src/i18n/web.js from this same origin (docs/TRANSLATION.md).
  'locales/en.json',
  'locales/languages.json',
  // Every other language once it is approved or in preview, and never before (docs/TRANSLATION.md).
  ...choosableLanguages(JSON.parse(readFileSync(join(root, 'locales/languages.json'), 'utf8')))
    .filter((language) => language.tag !== 'en')
    .map((language) => `locales/${language.tag}.json`),
];

if (releaseRevision !== 'local-development' && !/^[0-9a-f]{40}$/i.test(releaseRevision)) {
  throw new Error('TOGETHER_LEDGER_RELEASE_REVISION must be a full Git commit SHA or local-development.');
}

rmSync(output, { force: true, recursive: true });
mkdirSync(join(output, 'src'), { recursive: true });

for (const relativePath of publicFiles) {
  mkdirSync(dirname(join(output, relativePath)), { recursive: true });
  cpSync(join(root, relativePath), join(output, relativePath));
}
cpSync(join(root, 'public'), output, { recursive: true });
// The phone apps' link files (#266). Both must be right to ship at all: a wrong one fails
// silently on the phone (the link just opens the browser), so the build stops instead.
const associationProblems = appSiteAssociationProblems(readFileSync(join(output, APP_SITE_ASSOCIATION), 'utf8'));
if (associationProblems.length) throw new Error(associationProblems.join('; '));
const linkProblems = assetLinksProblems(readFileSync(join(output, ASSET_LINKS), 'utf8'));
if (linkProblems.length) throw new Error(linkProblems.join('; '));
// Served at /privacy (html_handling resolves privacy.html) — the URL both stores ask for.
writeFileSync(join(output, 'privacy.html'), renderPrivacyPage(readFileSync(join(root, 'PRIVACY.md'), 'utf8')));
// Served at /terms the same way, from TERMS.md.
writeFileSync(join(output, 'terms.html'), renderTermsPage(readFileSync(join(root, 'TERMS.md'), 'utf8')));
// And /support, from SUPPORT.md: the support URL on both stores.
writeFileSync(join(output, 'support.html'), renderSupportPage(readFileSync(join(root, 'SUPPORT.md'), 'utf8')));
writeFileSync(join(output, 'release.json'), `${JSON.stringify({ revision: releaseRevision }, null, 2)}\n`);

console.log(`Assembled ${publicFiles.length} app files, public assets, the privacy, terms and support pages, and release marker ${releaseRevision} in _site/.`);
