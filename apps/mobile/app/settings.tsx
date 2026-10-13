import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSession } from '../src/auth/session';
import { STILL_SIGNED_IN } from '../src/auth/session-state';
import { accountEmailLabel } from '../src/auth/social-sign-in';
import { awaitingYourAnswer } from '../src/journey/sharing-view';
import { useJourney } from '../src/journey/use-journey';
import { t } from '../src/i18n';
import { useLanguage } from '../src/i18n/language-provider';
import { accountSettingsRows, journeySettingsHeading, settingsSections } from '../src/shell/screens';
import { FootLink, SettingsGroup, SettingsHeading, SettingsRow } from '../src/components/settings-rows';
import { LanguageList } from '../src/components/language-choice';
import { RestorePurchases } from '../src/components/store-offers';
import { ThemePicker } from '../src/components/theme-picker';
import { Body, Screen } from '../src/components/ui';
import { thisBuild } from '../src/config/build';
import { useTheme } from '../src/theme';

/**
 * Settings: the one door, on the welcome and on the ledger (owner, Oct 12, 2026; #399), in the
 * platform's grouped rows. Appearance, with all four themes (#181); the open journey's own
 * settings, titled with its name (#184); then Account settings. Account deletion is one tap
 * away here, then a screen that says what it removes and keeps, then a confirmation: three taps,
 * the bar the stores set (#180). Privacy, Terms and Help sit at the foot for everyone, signed in
 * or not: the people who most need them may be the ones who cannot sign in. Language follows
 * Appearance, always (103A; decision 160).
 */
export default function SettingsScreen() {
  const session = useSession();
  const journey = useJourney();
  const { theme } = useTheme();
  useLanguage();
  const [helpOpen, setHelpOpen] = useState(false);
  const snapshot = journey.state.phase === 'ready' ? journey.state.snapshot : null;
  // The ledger's header says how many wait; here it says what they are waiting for.
  const waiting = awaitingYourAnswer(snapshot);

  const accountRows = {
    // An Apple account with no email shows plain words, not the placeholder it holds (#217).
    person: session.status === 'signed-in' ? <SettingsRow key="person" label={session.user.displayName || session.user.username} detail={accountEmailLabel(session.user.email)} onPress={() => router.push('/account')} /> : null,
    // Room and extras bought in the App Store or Google Play, honoured again on this phone (#275).
    restore: <RestorePurchases key="restore" row />,
    delete: (<SettingsRow key="delete" destructive label={t('common.account.delete')} onPress={() => router.push('/delete-account')} />),
    'still-signed-in': session.status === 'offline' ? <SettingsRow key="still-signed-in" label={t('common.account.settings')} detail={STILL_SIGNED_IN[session.reason]} onPress={() => router.push('/account')} /> : null,
    // The sign-in screen offers Create account too.
    'sign-in': (<SettingsRow key="sign-in" label={t('mobile.settings.signIn')} onPress={() => router.push('/account')} />),
  };

  const sections = {
    appearance: (
      <View key="appearance" style={styles.section}>
        <SettingsHeading>{t('common.appearance.title')}</SettingsHeading>
        <ThemePicker />
        <Body>{t('common.theme.note')}</Body>
      </View>
    ),
    // Every language in its own name and script; one in preview says so (decision 145), and one
    // still being translated says Coming soon (decision 160).
    language: (
      <View key="language" style={styles.section}>
        <SettingsHeading>{t('common.language.title')}</SettingsHeading>
        <LanguageList />
        <Body>{t('common.language.note')}</Body>
      </View>
    ),
    journey: snapshot ? (
      <SettingsGroup key="journey" heading={journeySettingsHeading(snapshot.journey.name)}>
        <SettingsRow label={waiting ? t('mobile.settings.sharingWaiting', { count: waiting }) : t('mobile.settings.sharing')} onPress={() => router.push('/journey-settings')} />
        <SettingsRow label={t('mobile.settings.history')} onPress={() => router.push('/history')} />
      </SettingsGroup>
    ) : null,
    account: (
      <SettingsGroup key="account" heading={t('common.account.settings')}>
        {accountSettingsRows(session.status).map((row) => accountRows[row])}
      </SettingsGroup>
    ),
  };

  return (
    <Screen title={t('mobile.screen.settings.title')}>
      {settingsSections({ journeyOpen: Boolean(snapshot) }).map((section) => sections[section])}
      <View style={styles.foot}>
        <View style={styles.links}>
          <FootLink label={t('mobile.settings.privacy')} onPress={() => router.push('/privacy')} />
          <FootLink label={t('mobile.settings.terms')} onPress={() => router.push('/terms')} />
          <FootLink label={t('mobile.settings.help')} expanded={helpOpen} onPress={() => setHelpOpen((open) => !open)} />
        </View>
        {helpOpen ? <Body selectable>{t('mobile.settings.helpText')}</Body> : null}
        {/* Which build this is (#359), to quote in a report: the version, build number and commit. */}
        <Text selectable accessibilityLabel={t('mobile.settings.build', { build: thisBuild.label })} style={[styles.build, { color: theme.colors.muted }]}>{thisBuild.label}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  foot: { gap: 8, marginTop: 8 },
  links: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16 },
  build: { fontSize: 14 },
});
