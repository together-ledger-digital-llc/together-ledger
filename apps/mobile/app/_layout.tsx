import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { SessionProvider, useSession } from '../src/auth/session';
import { t } from '../src/i18n';
import { LanguageProvider, useLanguage } from '../src/i18n/language-provider';
import { StoreProvider } from '../src/billing/store-provider';
import { ShellOverlays } from '../src/components/dialogs';
import { PendingInvitationProvider, PendingInvitationWatch } from '../src/invitations/use-pending-invitation';
import { awaitingYourAnswer } from '../src/journey/sharing-view';
import { JourneyProvider, useJourney } from '../src/journey/use-journey';
import { MomentViewProvider } from '../src/journey/use-moment-view';
import { useWaitingMoments, WaitingMomentsProvider } from '../src/journey/use-waiting-moments';
import { ShellProvider, useShell } from '../src/shell/shell-provider';
import { CONNECTION_SOURCE, offlineNotice } from '../src/shell/connection';
import { backAccessibilityLabel, backLabel, screenTitle, SETTINGS_GLYPH } from '../src/shell/screens';
import { useConnectionWatch } from '../src/shell/use-connection';
import { useStoredPreferences, type SaveFailure } from '../src/storage/use-stored-preferences';
import { fontSources, targetSize, ThemeProvider, useTheme } from '../src/theme';

/**
 * Settings from the ledger's header, at the 44-point minimum like everything else, with the gear
 * before the word (#399). Screen readers hear the label, never the gear.
 */
function SettingsButton() {
  const { theme } = useTheme();
  const journey = useJourney();
  // Seen from the ledger, where people actually are, and spelled out in full one screen in.
  const waiting = awaitingYourAnswer(journey.state.phase === 'ready' ? journey.state.snapshot : null);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={waiting ? t('mobile.settings.openWaitingSpoken', { count: waiting }) : t('mobile.settings.open')}
      onPress={() => router.push('/settings')}
      style={({ pressed }) => [styles.headerButton, targetSize, { opacity: pressed ? 0.7 : 1 }]}
    >
      <Text accessibilityElementsHidden importantForAccessibility="no" style={[styles.headerButtonText, { color: theme.colors.accent }]}>{SETTINGS_GLYPH}</Text>
      <Text style={[styles.headerButtonText, { color: theme.colors.accent }]}>{waiting ? t('mobile.settings.openWaiting', { count: waiting }) : t('mobile.settings.open')}</Text>
    </Pressable>
  );
}

/**
 * Android's back button, drawn so it can say where it goes (#411), as the iPhone's does. The
 * phone's own back gesture and key are untouched.
 */
function BackButton({ label }: { label: string }) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={backAccessibilityLabel(label)}
      onPress={() => router.back()}
      style={({ pressed }) => [styles.backButton, targetSize, { opacity: pressed ? 0.7 : 1 }]}
    >
      <Text accessibilityElementsHidden importantForAccessibility="no" style={[styles.backArrow, { color: theme.colors.fg }]}>←</Text>
      <Text numberOfLines={1} style={[styles.headerButtonText, { color: theme.colors.fg }]}>{label}</Text>
    </Pressable>
  );
}

function ThemedStack() {
  const { theme } = useTheme();
  // Every title and back button is read again when the language changes.
  useLanguage();
  return (
    <Stack
      screenOptions={({ route, navigation }) => {
        // Every back button names the screen it goes back to, never the one it is on (#411). The
        // iPhone took its words from the system, which named the screen in front.
        const back = backLabel(navigation.getState()?.routes, route.key);
        return {
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.fg,
          contentStyle: { backgroundColor: theme.colors.bg },
          headerBackTitle: back,
          ...(Platform.OS === 'android' && back ? { headerLeft: () => <BackButton label={back} /> } : {}),
        };
      }}
    >
      {/* The two surfaces (TL-M-06, #181). index decides which one opens. Each title here is
          the one src/shell/screens.ts gives back buttons (#411). */}
      <Stack.Screen name="index" options={{ title: screenTitle('index'), headerShown: false }} />
      <Stack.Screen name="ledger" options={{ title: screenTitle('ledger'), headerRight: () => <SettingsButton /> }} />
      <Stack.Screen name="settings" options={{ title: screenTitle('settings') }} />
      <Stack.Screen name="account" options={{ title: screenTitle('account') }} />
      <Stack.Screen name="register" options={{ title: screenTitle('register') }} />
      <Stack.Screen name="recovery" options={{ title: screenTitle('recovery') }} />
      <Stack.Screen name="recovery-confirm" options={{ title: screenTitle('recovery-confirm') }} />
      <Stack.Screen name="verify-email" options={{ title: screenTitle('verify-email') }} />
      <Stack.Screen name="change-password" options={{ title: screenTitle('change-password') }} />
      {/* An invitation, from a tapped link or pasted (#266). */}
      <Stack.Screen name="invite" options={{ title: screenTitle('invite') }} />
      <Stack.Screen name="delete-account" options={{ title: screenTitle('delete-account') }} />
      <Stack.Screen name="moment" options={{ title: screenTitle('moment'), presentation: 'modal' }} />
      <Stack.Screen name="new-journey" options={{ title: screenTitle('new-journey'), presentation: 'modal' }} />
      <Stack.Screen name="journey-settings" options={{ title: screenTitle('journey-settings') }} />
      <Stack.Screen name="history" options={{ title: screenTitle('history') }} />
      <Stack.Screen name="history-guide" options={{ title: screenTitle('history-guide') }} />
      <Stack.Screen name="privacy" options={{ title: screenTitle('privacy') }} />
      <Stack.Screen name="terms" options={{ title: screenTitle('terms') }} />
      <Stack.Screen name="concern" options={{ title: screenTitle('concern'), presentation: 'modal' }} />
    </Stack>
  );
}

/** A change the phone could not save is said in the status region, never as a crash. */
function SaveFailureNotice({ failure }: { failure: SaveFailure }) {
  const { showStatus } = useShell();
  useEffect(() => {
    if (failure) showStatus(failure.message, { tone: 'caution', source: 'storage' });
  }, [failure, showStatus]);
  return null;
}

/**
 * The standing offline notice, as a caution, cleared by its own source when the connection
 * returns (#300). Coming back online, or back to the foreground, checks the session again and
 * reloads the journeys, so an app opened offline recovers without a restart or a password, and
 * sends whatever moments were held while it was away (#352).
 */
function ConnectionWatch() {
  const { refresh } = useSession();
  const { reload } = useJourney();
  const { sendNow } = useWaitingMoments();
  const { showStatus, clearStatus } = useShell();
  const recheck = useCallback(() => {
    refresh().then(sendNow);
    reload();
  }, [refresh, reload, sendNow]);
  useConnectionWatch({
    onOffline: () => showStatus(offlineNotice(), { tone: 'caution', source: CONNECTION_SOURCE }),
    onOnline: () => {
      clearStatus(CONNECTION_SOURCE);
      recheck();
    },
    onForeground: recheck,
  });
  return null;
}

/**
 * When the service refuses this phone's sign-in (#194), whatever screen was open is closed and the
 * person is taken to sign in, with what happened said there: the password was changed, Sign out
 * everywhere was used, or the sign-in ran out. Never a half-loaded screen. Only a refusal does
 * this; a phone that cannot reach the service is still signed in (#353).
 */
function SignedOutWatch() {
  const { client } = useSession();
  useEffect(() => client.onSignedOut(() => {
    if (router.canDismiss()) router.dismissAll();
    router.push({ pathname: '/account', params: { notice: 'signedOutHere' } });
  }), [client]);
  return null;
}

export default function RootLayout() {
  // The serif ships inside the app (#177), so nothing is fetched at runtime.
  const [fontsLoaded] = useFonts(fontSources);
  // What the phone remembers (#185), read before the first screen so the saved theme is the first one drawn.
  const { stored, failure, saveTheme, saveMomentView, saveLanguage, completeOnboarding } = useStoredPreferences();
  if (!fontsLoaded || !stored) return null;
  return (
    <ThemeProvider initialChoice={stored.theme} onChoiceChange={saveTheme}>
      <SessionProvider>
        {/* The Language preference (101B): kept on this phone before signing in, on the account after. */}
        <LanguageProvider initialChoice={stored.language} onChoiceChange={saveLanguage}>
        <ShellProvider initialOnboardingComplete={stored.onboardingComplete} onOnboardingComplete={completeOnboarding}>
          {/* An invitation tapped or pasted, kept on this phone until it is answered (#266). */}
          <PendingInvitationProvider>
          <JourneyProvider>
            {/* Moments held without a connection, kept on this phone until they are sent (#352). */}
            <WaitingMomentsProvider>
              {/* The App Store or Google Play, while someone is signed in (#272). */}
              <StoreProvider>
                {/* Moments in full or compact (Oct 9), remembered on this phone like the theme. */}
                <MomentViewProvider initialView={stored.momentView} onViewChange={saveMomentView}>
                  <ThemedStack />
                </MomentViewProvider>
              </StoreProvider>
              <ConnectionWatch />
              <SignedOutWatch />
              <PendingInvitationWatch />
            </WaitingMomentsProvider>
          </JourneyProvider>
          </PendingInvitationProvider>
          <ShellOverlays />
          <SaveFailureNotice failure={failure} />
        </ShellProvider>
        </LanguageProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  headerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 12, maxWidth: 200 },
  backArrow: { fontSize: 22 },
  headerButtonText: { fontSize: 16, fontWeight: '700' },
});
