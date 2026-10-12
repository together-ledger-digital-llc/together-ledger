// The glossary as TBX, the file a translation platform's glossary imports (Crowdin, Lokalise
// and Weblate all read it): node scripts/export-glossary.mjs > glossary.tbx
import { readFileSync } from 'node:fs';
import { glossaryToTbx } from '../src/i18n/catalog.js';

process.stdout.write(glossaryToTbx(JSON.parse(readFileSync(new URL('../locales/glossary.json', import.meta.url), 'utf8'))));
