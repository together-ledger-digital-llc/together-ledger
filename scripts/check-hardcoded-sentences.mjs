// Fails when a sentence is written straight into an area that has already moved to t().
// The areas are listed in one place, scripts/i18n-moved-areas.json; 102 and 103 extend it as they
// move more. Run by npm run check. See docs/TRANSLATION.md.
//
// What counts as a sentence written straight in:
//
//   - in HTML: any text between tags with a letter in it, and any aria-label, placeholder, title
//     or alt with a letter in it. A moved element is left empty and names its key in data-i18n.
//   - in a script: text between JSX tags with a letter in it; a string with a letter given to
//     something people read (label, title, lead, aria-label, textContent, a toast, a status...);
//     and any other string that reads as words (a capital and then a space, or a word and then a
//     full stop, question mark or colon). Keys ('history.screen.title'), paths, style values and
//     select values ('yes', 'open') are none of these.
//
// It reads, it never parses: a regular-expression literal holding a quote can confuse it. None
// of the moved areas has one.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
export const AREAS_FILE = 'scripts/i18n-moved-areas.json';

// Everything outside [start, end) turned to spaces, newlines kept, so offsets stay the file's.
const blank = (text) => text.replace(/[^\n]/g, ' ');
const keepOnly = (text, ranges) => {
  let out = '';
  let at = 0;
  for (const [start, end] of [...ranges].sort((a, b) => a[0] - b[0])) {
    out += blank(text.slice(at, start)) + text.slice(start, end);
    at = end;
  }
  return out + blank(text.slice(at));
};
const blankOut = (text, ranges) => {
  let out = text;
  for (const [start, end] of ranges) out = out.slice(0, start) + blank(out.slice(start, end)) + out.slice(end);
  return out;
};
const lineOf = (text, offset) => text.slice(0, offset).split('\n').length;

/** Where an HTML element starts and ends, given the text of its opening tag up to its attributes. */
export function elementExtent(html, opening) {
  const start = html.indexOf(opening);
  if (start === -1) return null;
  const name = /^<([a-zA-Z][\w-]*)/.exec(opening)?.[1];
  const tags = new RegExp(`<(/?)${name}\\b[^>]*>`, 'g');
  tags.lastIndex = start;
  let depth = 0;
  for (let match; (match = tags.exec(html));) {
    depth += match[1] ? -1 : 1;
    if (depth === 0) return [start, match.index + match[0].length];
  }
  return [start, html.length];
}

/**
 * A script's strings, with what they are, and the script with its strings and comments blanked,
 * so brackets can be counted. A template's text is a string; its ${...} is script again.
 */
export function lexScript(source) {
  const strings = [];
  let code = '';
  let index = 0;
  const stack = [];
  while (index < source.length) {
    const character = source[index];
    const next = source[index + 1];
    if (character === '/' && next === '/') {
      const end = source.indexOf('\n', index);
      const stop = end === -1 ? source.length : end;
      code += blank(source.slice(index, stop));
      index = stop;
    } else if (character === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2);
      const stop = end === -1 ? source.length : end + 2;
      code += blank(source.slice(index, stop));
      index = stop;
    } else if (character === '"' || character === "'") {
      let end = index + 1;
      while (end < source.length && source[end] !== character && source[end] !== '\n') end += source[end] === '\\' ? 2 : 1;
      strings.push({ start: index, end: end + 1, value: source.slice(index + 1, end), quote: character });
      code += character + blank(source.slice(index + 1, end)) + character;
      index = end + 1;
    } else if (character === '`' || (character === '}' && stack.at(-1) === 'template')) {
      if (character === '}') stack.pop();
      let end = index + 1;
      while (end < source.length && source[end] !== '`' && !(source[end] === '$' && source[end + 1] === '{')) end += source[end] === '\\' ? 2 : 1;
      strings.push({ start: index, end: end + 1, value: source.slice(index + 1, end), quote: '`' });
      code += character + blank(source.slice(index + 1, end));
      if (source[end] === '$') {
        stack.push('template');
        code += '${';
        index = end + 2;
      } else {
        code += '`';
        index = end + 1;
      }
    } else {
      if (character === '{') stack.push('brace');
      if (character === '}') stack.pop();
      code += character;
      index += 1;
    }
  }
  return { strings, code };
}

/** From a statement's opening words to its closing semicolon, brackets balanced. */
export function statementExtent(source, code, opening) {
  const start = source.indexOf(opening);
  if (start === -1) return null;
  // A function declaration has no closing semicolon: it ends with its body's closing brace.
  const declaration = /^(?:export\s+)?(?:async\s+)?function\b/.test(opening);
  let depth = 0;
  for (let index = start; index < code.length; index += 1) {
    const character = code[index];
    if ('([{'.includes(character)) depth += 1;
    if (')]}'.includes(character)) depth -= 1;
    if (character === ';' && depth === 0) return [start, index + 1];
    if (character === '}' && depth === 0 && declaration) return [start, index + 1];
  }
  return [start, code.length];
}

const HAS_LETTER = /\p{L}/u;
const READS_AS_WORDS = /^\s*\p{Lu}[\p{L}’'-]*\s+\S|\p{L}[.?!:…]\s*$/u;
const SHOWN = /(?:\b(?:label|title|lead|heading|signedOut|noJourneys|placeholder|accessibilityLabel|accessibilityHint|confirmLabel|consequence|textContent|innerText|innerHTML|alt)\s*[:=]\s*\{?\s*|\b(?:showToast|showStatus|alert|confirm|setAttribute\(\s*['"]aria-label['"]\s*,)\s*\(?\s*)$/;

function htmlFindings(source, area) {
  const extent = elementExtent(source, area.element);
  if (!extent) return [{ line: 1, text: `${area.element} is no longer in ${area.file}; update ${AREAS_FILE}` }];
  const except = (area.except || []).map(({ element }) => elementExtent(source, element));
  const missing = (area.except || []).filter((_, position) => !except[position]);
  const scoped = blankOut(keepOnly(source, [extent]), except.filter(Boolean)).replace(/<!--[\s\S]*?-->/g, blank);
  const findings = missing.map(({ element }) => ({ line: 1, text: `${element} is no longer in ${area.file}; update ${AREAS_FILE}` }));
  for (const match of scoped.matchAll(/>([^<>]*)</g)) {
    const text = match[1].replace(/&[#\w]+;/g, '').trim();
    if (HAS_LETTER.test(text)) findings.push({ line: lineOf(source, match.index + 1), text });
  }
  for (const match of scoped.matchAll(/\s(aria-label|aria-description|placeholder|title|alt)="([^"]*)"/g)) {
    if (HAS_LETTER.test(match[2])) findings.push({ line: lineOf(source, match.index), text: `${match[1]}="${match[2]}"` });
  }
  return findings;
}

function scriptFindings(source, area) {
  const jsx = area.file.endsWith('.tsx') || area.file.endsWith('.jsx');
  // JSX text first, and blanked before reading strings, so an apostrophe in it isn't a quote.
  const jsxText = jsx ? [...source.matchAll(/(?<![=-])>([^<>{}=;()]*?)(?=[<{])/g)].filter((match) => HAS_LETTER.test(match[1])) : [];
  const { strings, code } = lexScript(blankOut(source, jsxText.map((match) => [match.index + 1, match.index + 1 + match[1].length])));
  const ranges = area.statements ? area.statements.map((opening) => statementExtent(source, code, opening)) : [[0, source.length]];
  const findings = (area.statements || []).filter((_, position) => !ranges[position])
    .map((opening) => ({ line: 1, text: `${opening} is no longer in ${area.file}; update ${AREAS_FILE}` }));
  const inArea = (offset) => ranges.some((range) => range && offset >= range[0] && offset < range[1]);
  for (const match of jsxText) {
    if (inArea(match.index)) findings.push({ line: lineOf(source, match.index + 1), text: match[1].trim() });
  }
  for (const string of strings) {
    if (!inArea(string.start) || !HAS_LETTER.test(string.value)) continue;
    const before = code.slice(Math.max(0, string.start - 80), string.start);
    if (/\b(?:from|import|require\(|import\()\s*$/.test(before)) continue;
    if (READS_AS_WORDS.test(string.value) || SHOWN.test(before)) findings.push({ line: lineOf(source, string.start), text: string.value });
  }
  return findings;
}

/**
 * Every sentence written straight into a moved area: [{ area, file, line, text }]. read(path)
 * gives a file's text, so a test can plant a sentence without touching the file.
 */
export function hardcodedSentences(areas, read = (path) => readFileSync(join(root, path), 'utf8')) {
  return areas.flatMap((area) => {
    const source = read(area.file);
    const found = area.kind === 'html' ? htmlFindings(source, area) : scriptFindings(source, area);
    // allow: words never translated. pending: a sentence not moved yet, each naming the prompt
    // that moves it ({ text, until }); one no longer in the file fails, so the list stays true.
    const pending = (area.pending || []).map((entry) => entry.text);
    const allowed = new Set([...(area.allow || []), ...pending]);
    const stale = pending.filter((text) => !found.some((finding) => finding.text === text))
      .map((text) => ({ line: 1, text: `${JSON.stringify(text)} is listed as pending but is no longer written in ${area.file}; take it out of ${AREAS_FILE}` }));
    return [...found.filter((finding) => !allowed.has(finding.text)), ...stale].sort((a, b) => a.line - b.line).map((finding) => ({ area: area.name, file: area.file, ...finding }));
  });
}

export function movedAreas() {
  return JSON.parse(readFileSync(join(root, AREAS_FILE), 'utf8')).areas;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const areas = movedAreas();
  const found = hardcodedSentences(areas);
  if (found.length) {
    console.error(`A sentence is written straight into an area that has moved to t(). Add it to locales/en.json and use its key (docs/TRANSLATION.md):\n${found.map((finding) => `  ${finding.file}:${finding.line}  ${finding.area}: ${JSON.stringify(finding.text)}`).join('\n')}`);
    process.exit(1);
  }
  console.log(`No sentence is written straight into the ${areas.length} areas moved to t() (${AREAS_FILE}).`);
}
