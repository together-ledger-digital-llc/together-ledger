// The page's words live in locales/en.json and are drawn at runtime (docs/TRANSLATION.md), so a
// sentence a visitor must be able to begin with may be in the page's HTML or in the English file
// it reads. The release gate and both live checks ask the same question, so they share the answer.

// True when any sentence in the parsed English file holds the text. Any sentence, not one key:
// the check is that the product's words are really there, and a key renamed by a later change
// should not break the gate over a sentence that is still shipped.
export function englishFileHasText(english, requiredText) {
  if (!english || typeof english !== 'object' || Array.isArray(english)) return false;
  return Object.values(english).some((sentence) => typeof sentence === 'string' && sentence.includes(requiredText));
}
