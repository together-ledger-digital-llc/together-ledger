import { Redirect, router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { LanguageControl } from '../src/components/language-choice';
import { Body, Button, Screen } from '../src/components/ui';
import { t } from '../src/i18n';
import { useLanguage } from '../src/i18n/language-provider';
import { sentenceParts } from '../src/i18n/sentences.js';
import { INVITATION_WORDS } from '../src/invitations/invitation-words';
import { useShell } from '../src/shell/shell-provider';
import { languageChoiceShown, SETTINGS_GLYPH } from '../src/shell/screens';
import { openingSurface } from '../src/shell/surface';
import { fonts, leading, scriptStyles, tracking, useTheme } from '../src/theme';

/**
 * Where the app opens. Someone who has begun their ledger goes straight to it; everyone else
 * meets the welcome first (the web's showWelcomeSurface / showLedgerSurface). The words are the
 * web's welcome (index.html). One Settings door (owner, Oct 12, 2026; #399): the account is
 * inside it, as Account settings, not a second button beside it. The door carries a gear before
 * its word (#399), as the ledger's does. Once there is more than English to choose, the language
 * choice sits small at the top (103A), so someone who can't read English finds it first.
 */
export default function WelcomeScreen() {
  const shell = useShell();
  const { theme } = useTheme();
  const { offered } = useLanguage();
  if (openingSurface({ onboardingComplete: shell.onboardingComplete }) === 'ledger') return <Redirect href="/ledger" />;
  return (
    <Screen title="Together Ledger" edges={['top', 'bottom', 'left', 'right']}>
      {languageChoiceShown(offered) ? <LanguageControl /> : null}
      <Text style={[styles.eyebrow, { color: theme.colors.accent }]}>{t('common.welcome.eyebrow')}</Text>
      <Text accessibilityRole="header" style={[styles.headline, fonts.serif, { color: theme.colors.fg }]}>
        {sentenceParts('common.welcome.headline', { together: t('common.welcome.headlineTogether') }).map((part, index) => (
          typeof part === 'string' ? part : <Text key={index} style={fonts.serifItalic}>{part.value}</Text>
        ))}
      </Text>
      <Body>{t('common.welcome.lead')}</Body>
      <Button label={t('mobile.welcome.begin')} onPress={() => {
        shell.completeOnboarding();
        router.replace('/ledger');
      }} />
      {/* Someone who installed the app to join a journey: the iPhone carries no link through the store (#266). */}
      <Button kind="quiet" label={INVITATION_WORDS.haveOne} onPress={() => router.push('/invite')} />
      <Button kind="quiet" glyph={SETTINGS_GLYPH} label={t('mobile.settings.open')} onPress={() => router.push('/settings')} />
    </Screen>
  );
}

const styles = scriptStyles(() => StyleSheet.create({
  eyebrow: { fontSize: 12, fontWeight: '900', letterSpacing: tracking(1.9), textTransform: 'uppercase' },
  headline: { fontSize: 40, lineHeight: leading(40, 44) },
}));
