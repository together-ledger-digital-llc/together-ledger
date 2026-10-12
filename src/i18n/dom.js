// t() on a web page. Plain JavaScript with no imports, copied unchanged into another web app.
// See docs/TRANSLATION.md.
//
// A page names its sentences by key in the markup, and this fills them in:
//
//   <h3 data-i18n="settings.backup.title"></h3>
//   <button data-i18n-aria-label="settings.dialog.close">×</button>
//
// A sentence with a person's own text in it goes through renderSentence, which puts that text in
// a <bdi>, so a Bengali name inside an English sentence (or the other way round) lays out right.

const ATTRIBUTES = ['aria-label', 'placeholder', 'title', 'alt'];

/** Fills every [data-i18n] element's text, and every [data-i18n-<attribute>], under root. */
export function applyTranslations(t, root = document) {
  for (const element of root.querySelectorAll('[data-i18n]')) element.textContent = t(element.dataset.i18n);
  for (const attribute of ATTRIBUTES) {
    for (const element of root.querySelectorAll(`[data-i18n-${attribute}]`)) {
      element.setAttribute(attribute, t(element.getAttribute(`data-i18n-${attribute}`)));
    }
  }
}

/** Replaces element's content with the sentence, each inserted piece of text in its own <bdi>. */
export function renderSentence(element, t, key, values = {}) {
  const document = element.ownerDocument;
  const nodes = t.parts(key, values, (text) => {
    const bdi = document.createElement('bdi');
    bdi.textContent = text;
    return bdi;
  }).map((part) => (typeof part === 'string' ? document.createTextNode(part) : part));
  element.replaceChildren(...nodes);
  return element;
}

/** The same sentence as markup, for code that builds a row as an HTML string. */
export function sentenceHtml(t, key, values = {}) {
  const escape = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  return t.parts(key, values, (text) => ({ isolated: text }))
    .map((part) => (typeof part === 'string' ? escape(part) : `<bdi>${escape(part.isolated)}</bdi>`))
    .join('');
}
