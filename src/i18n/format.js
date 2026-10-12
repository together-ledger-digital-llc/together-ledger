// The formatting helper: dates, numbers and money for the active language, with the digits that
// language is set to use. Plain JavaScript with no imports, shared by the web, the phone and the
// tests, and copied unchanged into other apps. See docs/TRANSLATION.md.
//
// Everything a person reads goes through here. Anything a machine reads (a file name, a stored
// day, a sort key) never does: it must not change with the language.

// The decimal digits of the numbering systems a product is likely to meet, zero to nine.
const DIGITS = {
  latn: '0123456789',
  arab: '٠١٢٣٤٥٦٧٨٩',
  arabext: '۰۱۲۳۴۵۶۷۸۹',
  beng: '০১২৩৪৫৬৭৮৯',
  deva: '०१२३४५६७८९',
  gujr: '૦૧૨૩૪૫૬૭૮૯',
  guru: '੦੧੨੩੪੫੬੭੮੯',
  knda: '೦೧೨೩೪೫೬೭೮೯',
  mlym: '൦൧൨൩൪൫൬൭൮൯',
  mymr: '၀၁၂၃၄၅၆၇၈၉',
  orya: '୦୧୨୩୪୫୬୭୮୯',
  tamldec: '௦௧௨௩௪௫௬௭௮௯',
  telu: '౦౧౨౩౪౫౬౭౮౯',
  thai: '๐๑๒๓๔๕๖๗๘๙',
};
const DIGIT_VALUE = new Map(Object.values(DIGITS).flatMap((digits) => [...digits].map((digit, value) => [digit, value])));

/** The numbering systems this helper can write digits in. */
export const NUMBERING_SYSTEMS = Object.freeze(Object.keys(DIGITS));

/**
 * Rewrites every decimal digit in already formatted text into one numbering system. Only ever
 * applied to what Intl wrote, never to a person's own text. It exists because not every engine
 * honours Intl's numberingSystem option: Hermes on iOS ignores it, for numbers and dates alike.
 */
export function withDigits(text, numberingSystem) {
  const digits = DIGITS[numberingSystem];
  if (!digits) return text;
  let out = '';
  for (const character of String(text)) {
    const value = DIGIT_VALUE.get(character);
    out += value === undefined ? character : digits[value];
  }
  return out;
}

/** language, script and region of a BCP 47 tag, enough to compare two of them. */
export function localeParts(tag) {
  const [language = '', ...rest] = String(tag || '').split(/[-_]/);
  const extension = rest.findIndex((part) => part.length === 1);
  const subtags = extension === -1 ? rest : rest.slice(0, extension);
  return {
    language: language.toLowerCase(),
    script: subtags.find((part) => /^[A-Za-z]{4}$/.test(part)) || '',
    region: subtags.find((part) => /^([A-Za-z]{2}|\d{3})$/.test(part))?.toUpperCase() || '',
  };
}

/**
 * Which locale writes a person's dates. A language's formatting says which locale it formats in
 * (English: en-US); with regionalDates, the person's own region is kept within that language:
 * a phone set to en-GB keeps 12 Oct 2026, one set to en-US keeps Oct 12, 2026, and a phone set
 * to hi-IN reading English gets English dates in the Indian order. Numbers and money never take
 * the region: they are always written in the language's own locale.
 */
export function dateLocale(formatting, deviceLocale) {
  const own = localeParts(formatting.locale);
  const device = localeParts(deviceLocale);
  if (!formatting.regionalDates || !device.language) return formatting.locale;
  if (device.language === own.language && device.script === own.script) return deviceLocale;
  if (!device.region) return formatting.locale;
  return [own.language, own.script, device.region].filter(Boolean).join('-');
}

/** The locale this engine formats in when nobody names one: the device's, or the browser's. */
export function deviceLocale(IntlApi = Intl) {
  try {
    return new IntlApi.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return '';
  }
}

/**
 * createFormatter({ locale, numberingSystem, regionalDates, device }) → format
 *
 *   locale          the language's formatting locale, e.g. 'en-US', 'bn', 'es-419'.
 *   numberingSystem 'latn', 'beng', 'deva'... or null for the locale's own default.
 *   regionalDates   true to keep the person's region in dates (see dateLocale).
 *   device          the device's locale; read from Intl when left out.
 *
 * format.number(value, options), format.money(amount, currency), format.date(value, options) and
 * format.dateTime(value, options) each return text, or null for a date that is not one.
 * format.messageFormatters is what createTranslator takes, so a number or date inside a sentence
 * is written the same way. None of them ever calls formatToParts: Hermes on iOS has none for
 * numbers and stops the app.
 *
 * @param {{ locale: string, numberingSystem?: string | null, regionalDates?: boolean, device?: string, IntlApi?: typeof Intl }} options
 */
export function createFormatter({ locale, numberingSystem = null, regionalDates = false, device, IntlApi = Intl }) {
  const formatting = { locale, regionalDates };
  const datesIn = dateLocale(formatting, device ?? deviceLocale(IntlApi));
  const extra = numberingSystem ? { numberingSystem } : {};
  const digits = (text) => (numberingSystem ? withDigits(text, numberingSystem) : text);
  const cache = new Map();
  const make = (kind, tag, options) => {
    const id = `${kind}\u0000${tag}\u0000${JSON.stringify(options || {})}`;
    if (!cache.has(id)) {
      const Format = kind === 'number' ? IntlApi.NumberFormat : IntlApi.DateTimeFormat;
      const native = new Format(tag, { ...extra, ...options });
      cache.set(id, { format: (value) => digits(native.format(value)), resolvedOptions: () => native.resolvedOptions() });
    }
    return cache.get(id);
  };
  const asDate = (value) => {
    if (value == null || value === '') return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  return {
    locale,
    dateLocale: datesIn,
    numberingSystem,
    number: (value, options) => make('number', locale, options).format(value),
    money(amount, currency, options) {
      if (!currency) return make('number', locale, { maximumFractionDigits: 2, ...options }).format(amount);
      try {
        return make('number', locale, { style: 'currency', currency, ...options }).format(amount);
      } catch {
        return make('number', locale, { maximumFractionDigits: 2 }).format(amount);
      }
    },
    date(value, options = { dateStyle: 'medium' }) {
      const date = asDate(value);
      return date ? make('date', datesIn, options).format(date) : null;
    },
    dateTime(value, options = { dateStyle: 'medium', timeStyle: 'short' }) {
      const date = asDate(value);
      return date ? make('date', datesIn, options).format(date) : null;
    },
    messageFormatters: {
      getNumberFormat: (_locales, options) => make('number', locale, options),
      getDateTimeFormat: (_locales, options) => make('date', datesIn, options),
      getPluralRules: (locales, options) => new IntlApi.PluralRules(locales, options),
    },
  };
}
