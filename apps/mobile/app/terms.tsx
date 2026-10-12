import terms from '../src/policies/terms.json';
import { PolicyDocument } from '../src/components/policy-document';
import { Body, Screen } from '../src/components/ui';
import { useLanguage } from '../src/i18n/language-provider';

/**
 * The terms of use, on the phone itself. Apple 3.1.2 asks each subscription offer to link to
 * them (src/components/store-offers.tsx), and Settings opens them for everyone. It is TERMS.md,
 * generated into terms.json by scripts/mobile-policies.mjs with the same parse as the web's
 * /terms page, and shown here rather than in a browser because the phone opens no web page
 * (#268).
 */
export default function TermsScreen() {
  // Redrawn when the language changes, so its words and its type follow at once.
  useLanguage();
  return (
    <Screen title={terms.title}>
      <PolicyDocument blocks={terms.blocks} />
      <Body selectable>Questions about these terms: legal@together-ledger.com.</Body>
    </Screen>
  );
}
