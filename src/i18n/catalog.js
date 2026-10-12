// Translation files, the languages manifest and the glossary: reading them and checking them.
// Plain JavaScript with no imports, copied unchanged into other apps. See docs/TRANSLATION.md.
//
// A translation file is ARB (Application Resource Bundle): one flat JSON object of
// "key": "ICU message", where "@key" holds the notes for translators and "@@locale" names the
// language. Crowdin, Lokalise and Weblate each import it, ICU plurals and notes included.

export const STATUSES = Object.freeze(['draft', 'in-review', 'approved']);

/** area.thing.element, each part lowerCamelCase: journey.leave.confirm, common.theme.label. */
export const KEY_PATTERN = /^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*){2,}$/;

/** The sentences of an ARB file, without its notes. */
export function messagesOf(arb) {
  return Object.fromEntries(Object.entries(arb).filter(([key]) => !key.startsWith('@')));
}

/** The note for translators on each key that has one. */
export function notesOf(arb) {
  return Object.fromEntries(Object.entries(arb)
    .filter(([key, value]) => key.startsWith('@') && !key.startsWith('@@') && value && typeof value.description === 'string')
    .map(([key, value]) => [key.slice(1), value.description]));
}

// IntlMessageFormat's element types (its TYPE enum).
const KIND = { 1: 'text', 2: 'number', 3: 'date', 4: 'time', 5: 'select', 6: 'plural', 8: 'tag' };

/**
 * Every placeholder a message uses, by name, with what it is: text, number, date, time, select or
 * plural. A placeholder used two ways is listed with both, joined by "+".
 */
export function placeholdersOf(ast) {
  const found = new Map();
  const walk = (elements) => {
    for (const element of elements) {
      const kind = KIND[element.type];
      if (kind) {
        const kinds = found.get(element.value) || new Set();
        kinds.add(kind === 'plural' && element.pluralType === 'ordinal' ? 'selectordinal' : kind);
        found.set(element.value, kinds);
      }
      if (element.options) Object.values(element.options).forEach((option) => walk(option.value));
      if (element.children) walk(element.children);
    }
  };
  walk(ast);
  return Object.fromEntries([...found].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([name, kinds]) => [name, [...kinds].sort().join('+')]));
}

/** The "other" branch ICU requires of every plural and select, wherever it is nested. */
function missingOther(ast) {
  return ast.some((element) => (element.options && (!element.options.other || Object.values(element.options).some((option) => missingOther(option.value))))
    || (element.children && missingOther(element.children)));
}

/**
 * What is wrong with one message: it does not parse, a plural or select has no "other", or (given
 * the source's placeholders) a placeholder was dropped, added, renamed or changed kind.
 */
export function messageProblems(key, message, locale, MessageFormat, sourcePlaceholders) {
  if (typeof message !== 'string' || !message.trim()) return [`${key} is empty`];
  let ast;
  try {
    ast = new MessageFormat(message, locale, undefined, { ignoreTag: true }).getAst();
  } catch (error) {
    return [`${key} does not parse: ${error.message}`];
  }
  const problems = [];
  if (missingOther(ast)) problems.push(`${key} has a plural or select without an "other" branch`);
  if (sourcePlaceholders) {
    const own = placeholdersOf(ast);
    for (const [name, kind] of Object.entries(sourcePlaceholders)) {
      if (!(name in own)) problems.push(`${key} drops the placeholder {${name}}`);
      else if (own[name] !== kind) problems.push(`${key} uses {${name}} as ${own[name]}, not ${kind}`);
    }
    for (const name of Object.keys(own)) {
      if (!(name in sourcePlaceholders)) problems.push(`${key} has a placeholder {${name}} the source does not`);
    }
  }
  return problems;
}

/** Problems with the source language file itself: key shape, a note on every key, every message parsing. */
export function sourceProblems(arb, MessageFormat) {
  const locale = arb['@@locale'];
  const problems = locale ? [] : ['the source file has no @@locale'];
  const notes = notesOf(arb);
  for (const [key, message] of Object.entries(messagesOf(arb))) {
    if (!KEY_PATTERN.test(key)) problems.push(`${key} is not area.thing.element`);
    if (!notes[key]) problems.push(`${key} has no note for translators`);
    problems.push(...messageProblems(key, message, locale || 'en', MessageFormat));
  }
  for (const key of Object.keys(arb)) {
    if (key.startsWith('@') && !key.startsWith('@@') && !(key.slice(1) in arb)) problems.push(`${key} is a note for a key that does not exist`);
  }
  return problems;
}

/**
 * Problems with a translation compared with its source: a key missing, a key the source does not
 * have, a placeholder dropped, added or renamed, a message that does not parse, or the wrong
 * @@locale. An approved language must have none.
 */
export function translationProblems(source, translation, tag, MessageFormat) {
  const problems = [];
  if (translation['@@locale'] !== tag) problems.push(`its @@locale is ${JSON.stringify(translation['@@locale'])}, not "${tag}"`);
  const sourceMessages = messagesOf(source);
  const messages = messagesOf(translation);
  const sourceLocale = source['@@locale'] || 'en';
  for (const key of Object.keys(sourceMessages)) {
    if (!(key in messages)) problems.push(`${key} is missing`);
  }
  for (const [key, message] of Object.entries(messages)) {
    if (!(key in sourceMessages)) {
      problems.push(`${key} is not in the source`);
      continue;
    }
    const sourceAst = new MessageFormat(sourceMessages[key], sourceLocale, undefined, { ignoreTag: true }).getAst();
    problems.push(...messageProblems(key, message, tag, MessageFormat, placeholdersOf(sourceAst)));
  }
  return problems;
}

/** Problems with the languages manifest: its shape, its statuses, approvals and fallbacks. */
export function manifestProblems(manifest) {
  const problems = [];
  const languages = Array.isArray(manifest?.languages) ? manifest.languages : [];
  if (!languages.length) problems.push('the manifest lists no languages');
  const tags = languages.map((language) => language.tag);
  if (!tags.includes(manifest?.source)) problems.push(`the source language ${JSON.stringify(manifest?.source)} is not listed`);
  if (new Set(tags).size !== tags.length) problems.push('a language is listed twice');
  for (const language of languages) {
    const name = language.tag || '(no tag)';
    if (!STATUSES.includes(language.status)) problems.push(`${name} has the status ${JSON.stringify(language.status)}; it must be one of ${STATUSES.join(', ')}`);
    const isSource = language.tag === manifest.source;
    if (language.status === 'approved' && !isSource) {
      if (!language.reviewer) problems.push(`${name} is approved with no reviewer`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(language.approvedOn || '')) problems.push(`${name} is approved with no approval date`);
    }
    if (language.status !== 'approved' && language.approvedOn) problems.push(`${name} has an approval date but is ${language.status}`);
    if (isSource) {
      if (language.status !== 'approved') problems.push(`the source language ${name} must be approved`);
      if (language.fallback) problems.push(`the source language ${name} falls back to nothing`);
    } else if (language.fallback !== manifest.source) {
      problems.push(`${name} falls back to ${JSON.stringify(language.fallback)}; every language falls back to the source, ${manifest.source}`);
    }
    if (!language.formatting || typeof language.formatting.locale !== 'string') problems.push(`${name} has no formatting locale`);
  }
  return problems;
}

/** The languages that may be offered to people: approved ones, and only those. */
export function offeredLanguages(manifest) {
  return (manifest?.languages || []).filter((language) => language.status === 'approved');
}

/**
 * The gate on every approved language: each must have its file, and its file must pass
 * translationProblems against the source. translations is { tag: parsed ARB file }.
 */
export function approvedLanguageProblems(manifest, source, translations, MessageFormat) {
  return offeredLanguages(manifest)
    .filter((language) => language.tag !== manifest.source)
    .flatMap((language) => (translations[language.tag]
      ? translationProblems(source, translations[language.tag], language.tag, MessageFormat).map((problem) => `${language.tag}: ${problem}`)
      : [`${language.tag}: approved, but it has no translation file`]));
}

/** One language's entry, or undefined. */
export function languageOf(manifest, tag) {
  return (manifest?.languages || []).find((language) => language.tag === tag);
}

/**
 * The glossary as TBX (TermBase eXchange, ISO 30042), the file a translation platform's glossary
 * imports: one entry per term, the source term with its definition and what never to use
 * instead, and each language's agreed term once it has one.
 */
export function glossaryToTbx(glossary) {
  const escape = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const source = glossary.source;
  const entries = glossary.terms.map((term) => {
    const notes = [term.definition, term.avoid?.length ? `Never: ${term.avoid.join(', ')}.` : ''].filter(Boolean).join(' ');
    const languages = Object.entries(term.translations || {}).filter(([, value]) => value && value.term);
    return [
      `      <termEntry id="${escape(term.id)}">`,
      `        <descrip type="definition">${escape(notes)}</descrip>`,
      `        <langSet xml:lang="${escape(source)}"><tig><term>${escape(term.term)}</term>${term.partOfSpeech ? `<termNote type="partOfSpeech">${escape(term.partOfSpeech)}</termNote>` : ''}</tig></langSet>`,
      ...languages.map(([tag, value]) => `        <langSet xml:lang="${escape(tag)}"><tig><term>${escape(value.term)}</term>${value.note ? `<note>${escape(value.note)}</note>` : ''}</tig></langSet>`),
      '      </termEntry>',
    ].join('\n');
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<martif type="TBX" xml:lang="' + escape(source) + '">',
    '  <martifHeader><fileDesc><sourceDesc><p>' + escape(glossary.title || 'Glossary') + '</p></sourceDesc></fileDesc></martifHeader>',
    '  <text>',
    '    <body>',
    ...entries,
    '    </body>',
    '  </text>',
    '</martif>',
    '',
  ].join('\n');
}
