import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { englishFileHasText } from './required-text.mjs';
import { appSiteAssociationProblems, APP_SITE_ASSOCIATION, ASSET_LINKS, assetLinksProblems } from './app-links.mjs';

// Proves the bundle about to be uploaded is the reviewed revision, before it is uploaded.
//
// This asks nothing of the network. Every check that reached the public site was refused by
// Bot fight mode, which is the site doing its job — a release gate should not need that
// protection weakened in order to pass. What can be verified without asking the internet is
// verified here; what cannot is stated as a boundary rather than faked.
//
//   node scripts/verify-release-bundle.mjs --directory _site --revision <sha> --required-text "…"
//
// The required text may be in index.html or in locales/en.json.

const defaults = { directory: '_site' };

function parseArguments(argv) {
  const options = { ...defaults };
  const flags = ['--directory', '--revision', '--required-text'];
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!value || !flags.includes(flag)) {
      throw new Error('Usage: verify-release-bundle.mjs --revision <full-sha> --required-text <text> [--directory <path>]');
    }
    if (flag === '--directory') options.directory = value;
    if (flag === '--revision') options.revision = value;
    if (flag === '--required-text') options.requiredText = value;
  }
  return options;
}

export async function verifyReleaseBundle({ directory, revision, requiredText, readFileImpl = readFile }) {
  if (!/^[0-9a-f]{40}$/i.test(revision || '')) throw new Error('The expected revision must be a full Git commit SHA.');
  if (!requiredText) throw new Error('A user-visible required text value is required.');

  let markerRaw;
  try {
    markerRaw = await readFileImpl(join(directory, 'release.json'), 'utf8');
  } catch {
    throw new Error(`The bundle has no release marker at ${join(directory, 'release.json')}.`);
  }

  let marker;
  try {
    marker = JSON.parse(markerRaw);
  } catch (error) {
    throw new Error(`The release marker is not valid JSON: ${error.message}`);
  }
  if (marker.revision !== revision) {
    throw new Error(`The bundle carries revision ${marker.revision || 'none'} instead of the reviewed ${revision}.`);
  }

  let home;
  try {
    home = await readFileImpl(join(directory, 'index.html'), 'utf8');
  } catch {
    throw new Error(`The bundle has no page at ${join(directory, 'index.html')}.`);
  }
  // A marker alone proves a build ran. The control proves the page a person lands on is the
  // product rather than an error page or an empty shell that happens to carry the right sha.
  // The page draws its sentences at runtime from locales/en.json (docs/TRANSLATION.md), so the
  // words count when they are in the page or in the English file shipped beside it, both read
  // from the bundle and neither from the network.
  if (!home.includes(requiredText)) {
    let englishRaw;
    try {
      englishRaw = await readFileImpl(join(directory, 'locales', 'en.json'), 'utf8');
    } catch {
      throw new Error(
        `The bundle's page does not contain the required user-visible control ${JSON.stringify(requiredText)}, and the bundle has no ${join(directory, 'locales', 'en.json')} to draw it from.`,
      );
    }
    let english;
    try {
      english = JSON.parse(englishRaw);
    } catch (error) {
      throw new Error(`The bundle's locales/en.json is not valid JSON: ${error.message}`);
    }
    if (!englishFileHasText(english, requiredText)) {
      throw new Error(`Neither the bundle's page nor its locales/en.json contains the required user-visible control ${JSON.stringify(requiredText)}.`);
    }
  }

  // The phone apps' link files (#266), read from the bundle like the rest. Apple's must be there and
  // claim only invitations. Android's may be absent while the owner's fingerprints are not yet in,
  // but never shipped empty or with a placeholder.
  let association;
  try {
    association = await readFileImpl(join(directory, APP_SITE_ASSOCIATION), 'utf8');
  } catch {
    throw new Error(`The bundle has no ${APP_SITE_ASSOCIATION}.`);
  }
  const associationProblems = appSiteAssociationProblems(association);
  if (associationProblems.length) throw new Error(`The bundle's ${APP_SITE_ASSOCIATION} is wrong: ${associationProblems.join('; ')}.`);
  let assetLinks;
  try {
    assetLinks = await readFileImpl(join(directory, ASSET_LINKS), 'utf8');
  } catch {
    throw new Error(`The bundle has no ${ASSET_LINKS}.`);
  }
  const linkProblems = assetLinksProblems(assetLinks);
  if (linkProblems.length) throw new Error(`The bundle's ${ASSET_LINKS} must not ship: ${linkProblems.join('; ')}.`);

  return { revision, requiredText };
}

async function main() {
  const result = await verifyReleaseBundle(parseArguments(process.argv.slice(2)));
  console.log(`✓ the assembled bundle carries revision ${result.revision} and the required user-visible control.`);
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main().catch((error) => {
    console.error(`Release bundle verification failed: ${error.message}`);
    process.exit(1);
  });
}
