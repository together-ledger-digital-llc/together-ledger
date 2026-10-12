// The pseudo-language: English made longer, accented and bracketed, for testing layouts only.
// Plain JavaScript with no imports, copied unchanged into another app. See docs/TRANSLATION.md.
//
//   "Backup and restore"   →   "[Bááçķúp ááñď ŕééšťóóŕé]"
//
// Every sentence comes out about 30% longer than English, which is roughly what Hindi, Bengali
// and Spanish need, with its letters accented and the whole of it in [brackets]. A sentence
// that is cut off loses its closing bracket; one that overflows shows where; and a sentence
// still written straight into a screen is the one without accents. The accents sit above the
// capitals, so a line height that clips them shows too.
//
// Only the words change. Placeholders ({journey}, {count, number}), plurals, selects, # inside
// a plural, ICU's quoting apostrophes and HTML tags come through exactly as they were, so every
// sentence still formats with the same values. pseudoProblems() proves it, key by key.
//
// It is never a language people are offered: it is not in locales/languages.json, it has no
// translation file, and it is not shipped. The web's production build and the server image both
// leave this file out, and the phone only reaches it behind __DEV__.

/** The tag it goes by in a log. en-XA is the pseudo-locale Android and Chromium use for this. */
export const PSEUDO_LOCALE = 'en-XA';

/** How much longer than English a pseudo sentence is. */
export const PSEUDO_EXPANSION = 0.3;

// Each letter's accented twin, from Latin-1 and Latin Extended-A, which the product's fonts
// cover. b, f, m, p, q, v and x have no twin there and stay as they are.
const ACCENTED = {
  a: 'á', c: 'ç', d: 'ď', e: 'é', g: 'ĝ', h: 'ĥ', i: 'í', j: 'ĵ', k: 'ķ', l: 'ľ', n: 'ñ', o: 'ó', r: 'ŕ', s: 'š', t: 'ť', u: 'ú', w: 'ŵ', y: 'ý', z: 'ž',
  A: 'Á', C: 'Ç', D: 'Ď', E: 'É', G: 'Ĝ', H: 'Ĥ', I: 'Í', J: 'Ĵ', K: 'Ķ', L: 'Ľ', N: 'Ñ', O: 'Ó', R: 'Ŕ', S: 'Š', T: 'Ť', U: 'Ú', W: 'Ŵ', Y: 'Ý', Z: 'Ž',
};
const VOWEL = /[aeiouyAEIOUY]/;
const TAG = /^<\/?[A-Za-z][^<>]*>/;
const ENTITY = /^&(?:#\d+|#x[0-9A-Fa-f]+|[A-Za-z][A-Za-z0-9]*);/;
const CHOICE = new Set(['plural', 'select', 'selectordinal']);

/**
 * One English ICU message in the pseudo-language. Only literal text is changed: the message is
 * read the way ICU reads it, and every argument, choice, # and quotation is copied as it is.
 */
export function pseudoLocalize(message) {
  const source = String(message);
  let index = 0;
  // Extra letters owed, carried from word to word so a sentence of short words still grows
  // about 30% overall, rather than every one-letter word doubling.
  let owed = 0;

  const word = (letters) => {
    owed += letters.length * PSEUDO_EXPANSION;
    const extra = Math.floor(owed);
    owed -= extra;
    // Lengthen by doubling vowels, as a longer word would, spread across the word.
    const characters = [...letters];
    const vowels = characters.map((_, position) => position).filter((position) => VOWEL.test(characters[position]));
    const stretch = vowels.length ? vowels : [characters.length - 1];
    const times = characters.map(() => 0);
    for (let added = 0; added < extra; added += 1) times[stretch[added % stretch.length]] += 1;
    return characters.map((letter, position) => {
      const lower = letter.toLowerCase();
      return (ACCENTED[letter] || letter) + (ACCENTED[lower] || lower).repeat(times[position]);
    }).join('');
  };

  const text = (literal) => literal.replace(/[A-Za-z]+/g, word);

  // A run of message up to an unmatched "}" or the end. inPlural: "#" is the number.
  const messageUntilClose = (inPlural) => {
    let out = '';
    let literal = '';
    const flush = () => {
      out += text(literal);
      literal = '';
    };
    while (index < source.length) {
      const character = source[index];
      const rest = source.slice(index);
      if (character === '}') break;
      if (character === '{') {
        flush();
        out += argument();
      } else if (character === "'" && source[index + 1] === "'") {
        flush();
        out += "''";
        index += 2;
      } else if (character === "'" && (/[{}|]/.test(source[index + 1] || '') || (inPlural && source[index + 1] === '#'))) {
        // ICU quotation, up to the closing apostrophe ('' inside is an apostrophe): its braces and
        // apostrophes are kept exactly, and only its letters change.
        flush();
        let end = index + 1;
        while (end < source.length && !(source[end] === "'" && source[end + 1] !== "'")) end += source[end] === "'" ? 2 : 1;
        out += `'${text(source.slice(index + 1, end))}${end < source.length ? "'" : ''}`;
        index = end + 1;
      } else if (character === '#' && inPlural) {
        flush();
        out += '#';
        index += 1;
      } else if (character === '<' && TAG.test(rest)) {
        flush();
        const tag = rest.match(TAG)[0];
        out += tag;
        index += tag.length;
      } else if (character === '&' && ENTITY.test(rest)) {
        flush();
        const entity = rest.match(ENTITY)[0];
        out += entity;
        index += entity.length;
      } else {
        literal += character;
        index += 1;
      }
    }
    flush();
    return out;
  };

  // From "{" to its "}": copied, except the branches of a plural or select, which are messages.
  const argument = () => {
    const start = index;
    index += 1;
    const header = /^\s*[^\s,{}]+\s*(?:,\s*([A-Za-z]+)\s*,?)?/.exec(source.slice(index));
    const type = header && header[1];
    if (!header || !CHOICE.has(type)) {
      let depth = 1;
      while (index < source.length && depth) {
        if (source[index] === '{') depth += 1;
        if (source[index] === '}') depth -= 1;
        index += 1;
      }
      return source.slice(start, index);
    }
    index += header[0].length;
    let out = source.slice(start, index);
    while (index < source.length) {
      const space = /^\s*/.exec(source.slice(index))[0];
      out += space;
      index += space.length;
      if (source[index] === '}') {
        index += 1;
        return `${out}}`;
      }
      if (source[index] === '{') {
        index += 1;
        const branch = messageUntilClose(type !== 'select');
        index += 1;
        out += `{${branch}}`;
        continue;
      }
      const selector = /^[^\s{}]+/.exec(source.slice(index));
      if (!selector) break;
      out += selector[0];
      index += selector[0].length;
    }
    return out;
  };

  let out = '';
  while (index < source.length) {
    out += messageUntilClose(false);
    if (index < source.length) {
      out += source[index];
      index += 1;
    }
  }
  return `[${out}]`;
}

/** Every sentence of a { key: 'ICU message' } catalog in the pseudo-language. */
export function pseudoMessages(messages) {
  return Object.fromEntries(Object.entries(messages).map(([key, message]) => [key, pseudoLocalize(message)]));
}

// IntlMessageFormat's element types (its TYPE enum): literal text is 0, a tag is 8.
const LITERAL = 0;

/**
 * What a message is made of, without its words: every argument with its kind, style and name,
 * every plural and select with its branches and offset, every #, in order and nested as they are.
 */
export function structureOf(ast) {
  return ast.filter((element) => element.type !== LITERAL).map((element) => ({
    type: element.type,
    value: element.value,
    style: element.style && typeof element.style === 'object' ? JSON.stringify(element.style) : element.style,
    offset: element.offset,
    pluralType: element.pluralType,
    options: element.options && Object.fromEntries(Object.entries(element.options).map(([selector, option]) => [selector, structureOf(option.value)])),
    children: element.children && structureOf(element.children),
  }));
}

/** Every word a message writes itself, from every branch: its literal text, joined. */
function wordsOf(ast) {
  return ast.map((element) => (element.type === LITERAL ? element.value : '')
    + (element.options ? Object.values(element.options).map((option) => wordsOf(option.value)).join('') : '')
    + (element.children ? wordsOf(element.children) : '')).join('');
}

/** The HTML tags in a message, in order, exactly as written. */
export function tagsOf(message) {
  return String(message).match(/<\/?[A-Za-z][^<>]*>/g) || [];
}

/**
 * What the pseudo-language broke in a catalog, key by key: a sentence that no longer parses,
 * any placeholder, plural, select or # lost, added, renamed or moved, any HTML tag changed, or
 * a sentence that came out no longer, unaccented or unbracketed. pseudo is the transform under
 * test, pseudoLocalize unless a test passes a broken one.
 */
export function pseudoProblems(messages, MessageFormat, pseudo = pseudoLocalize, locale = 'en') {
  const problems = [];
  const parse = (message) => new MessageFormat(message, locale, undefined, { ignoreTag: true }).getAst();
  for (const [key, message] of Object.entries(messages)) {
    const pseudoMessage = pseudo(message);
    let ast;
    try {
      ast = parse(pseudoMessage);
    } catch (error) {
      problems.push(`${key} does not parse in the pseudo-language: ${error.message}`);
      continue;
    }
    if (JSON.stringify(structureOf(ast)) !== JSON.stringify(structureOf(parse(message)))) {
      problems.push(`${key} lost, renamed or changed a placeholder, plural or select: ${JSON.stringify(message)} became ${JSON.stringify(pseudoMessage)}`);
    }
    if (JSON.stringify(tagsOf(pseudoMessage)) !== JSON.stringify(tagsOf(message))) {
      problems.push(`${key} changed an HTML tag: ${JSON.stringify(tagsOf(message))} became ${JSON.stringify(tagsOf(pseudoMessage))}`);
    }
    if (!pseudoMessage.startsWith('[') || !pseudoMessage.endsWith(']')) problems.push(`${key} is not in brackets`);
    const english = wordsOf(parse(message));
    const pseudoWords = wordsOf(ast);
    if (/[A-Za-z]/.test(english) && pseudoWords.length <= english.length) problems.push(`${key} is no longer than English`);
    if (/[aceinorstu]/.test(pseudoWords.replace(/<[^<>]*>|&[^;\s]+;/g, ''))) problems.push(`${key} has an unaccented letter`);
  }
  return problems;
}
