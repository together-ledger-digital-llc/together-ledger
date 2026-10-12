import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { accountMessage, ACCOUNT_NOTICES } from '../src/auth/account-messages';
import { useSession } from '../src/auth/session';
import { ACCOUNT_WHILE_OFFLINE } from '../src/auth/session-state';
import { accountEmailLabel, appleSharedNoEmail, noEmailSupport } from '../src/auth/social-sign-in';
import { t } from '../src/i18n';
import { useLanguage } from '../src/i18n/language-provider';
import { useJourney } from '../src/journey/use-journey';
import { useWaitingMoments } from '../src/journey/use-waiting-moments';
import { signOutConsequence, signOutEverywhereConsequence } from '../src/journey/waiting-moments';
import { useShell } from '../src/shell/shell-provider';
import { SocialSignIn } from '../src/components/social-sign-in';
import { Body, Button, Field, Notice, Screen } from '../src/components/ui';
import { INVITATION_WORDS } from '../src/invitations/invitation-words';

/**
 * Sign in, or, once signed in, the account itself: who you are, whether your email is verified,
 * and signing out. TL-M-05 (#180). Settings opens it as Account settings, the name the sign-in
 * screen's own words give it (#399). The words are the web's (index.html, src/app.js).
 */
export default function AccountScreen() {
  const session = useSession();
  // Its words are read again when the language changes.
  useLanguage();
  // A screen that closes after it succeeds (registering, deleting) leaves its message here.
  const { notice: carried } = useLocalSearchParams<{ notice?: keyof typeof ACCOUNT_NOTICES }>();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState<'sign-in' | 'resend' | 'sign-out' | 'sign-out-everywhere' | 'refresh' | 'name' | null>(null);
  // The name being edited; null until the person types, so it shows their current name.
  const [name, setName] = useState<string | null>(null);
  const journey = useJourney();
  const waiting = useWaitingMoments();
  const shell = useShell();
  const [notice, setNotice] = useState<string | null>(carried && carried in ACCOUNT_NOTICES ? ACCOUNT_NOTICES[carried] : null);
  const [problem, setProblem] = useState(false);

  async function run(action: typeof pending, work: () => Promise<string | null>, area?: string) {
    setPending(action);
    setNotice(null);
    try {
      const message = await work();
      setProblem(false);
      setNotice(message);
    } catch (error) {
      setProblem(true);
      setNotice(accountMessage(error, area));
    } finally {
      setPending(null);
    }
  }

  if (session.status === 'loading') return <Screen title={t('mobile.screen.account.title')}><Body>{t('mobile.account.checking')}</Body></Screen>;

  // Signed in, but the service could not be asked (#352). The password form would ask for
  // something this phone does not need.
  if (session.status === 'offline') {
    return (
      <Screen title={t('mobile.screen.account.title')}>
        <Body>{ACCOUNT_WHILE_OFFLINE[session.reason]}</Body>
        <Button kind="quiet" label={t('mobile.action.tryAgain')} pending={pending === 'refresh'} onPress={() => run('refresh', async () => {
          await session.refresh();
          return null;
        })} />
      </Screen>
    );
  }

  if (session.status === 'signed-in') {
    const { user } = session;
    return (
      <Screen title={t('mobile.screen.account.title')} lead={t('common.account.passwordsPrivate')}>
        {/* An Apple account with no email shows plain words, not the placeholder it holds (#217). */}
        <Body>{t('mobile.account.who', { name: user.displayName || user.username, email: accountEmailLabel(user.email) })}</Body>
        <Body>{user.emailVerified ? t('mobile.account.emailVerified') : t('mobile.account.emailNotVerified')}</Body>
        {/* The name journeyers see (#253). Each journey notes when it changes; the handle stays private. */}
        <Field label={t('common.account.nameLabel')} value={name ?? user.displayName} onChangeText={setName} limit={80} autoComplete="name" textContentType="name" hint={t('mobile.account.nameHint', { handle: user.username })} />
        <Button kind="quiet" label={t('common.account.saveName')} pending={pending === 'name'} pendingLabel={t('mobile.action.saving')} disabled={!(name ?? user.displayName).trim() || (name ?? user.displayName).trim() === user.displayName} onPress={() => run('name', async () => {
          session.setUser(await session.client.changeDisplayName((name ?? user.displayName).trim()));
          setName(null);
          await journey.reload();
          return t('common.account.nameSaved');
        })} />
        {/* An Apple account with no email can't be sent one; it is told where to write (#217). */}
        {appleSharedNoEmail(user.email) ? <Body selectable>{noEmailSupport()}</Body> : null}
        {!user.emailVerified && !appleSharedNoEmail(user.email) ? (
          <>
            <Button kind="quiet" label={t('common.account.resendVerification')} pending={pending === 'resend'} pendingLabel={t('common.action.sending')} onPress={() => run('resend', async () => (
              await session.client.resendVerification() ? ACCOUNT_NOTICES.verificationResent : ACCOUNT_NOTICES.verificationDelayed
            ))} />
            <Button kind="quiet" label={t('mobile.account.verifiedInBrowser')} pending={pending === 'refresh'} onPress={() => run('refresh', async () => {
              await session.refresh();
              return null;
            })} />
          </>
        ) : null}
        <Notice message={notice} tone={problem ? 'problem' : 'info'} />
        <Body>{t('mobile.account.signOutNote')}</Body>
        <Button kind="quiet" label={t('common.account.signOut')} pending={pending === 'sign-out'} onPress={async () => {
          // Moments still waiting on this phone are said, and asked about, before they go (#352).
          const held = waiting.moments.length;
          if (held && !await shell.confirmConsequence(signOutConsequence(held))) return;
          await run('sign-out', async () => {
            if (held) await waiting.clear();
            try {
              await session.client.logout();
            } finally {
              session.setUser(null);
            }
            return ACCOUNT_NOTICES.signedOut;
          });
        }} />
        {/* #194. Every device, this one included, behind the consequence dialog; moments still
            waiting here are named in it, as signing out names them. They are removed only once
            the service has signed everything out, so a phone that can't reach it loses nothing. */}
        <Button kind="quiet" label={t('common.account.signOutEverywhere')} pending={pending === 'sign-out-everywhere'} pendingLabel={t('common.account.signingOut')} onPress={async () => {
          const held = waiting.moments.length;
          if (!await shell.confirmConsequence(signOutEverywhereConsequence(held))) return;
          await run('sign-out-everywhere', async () => {
            await session.client.logoutEverywhere();
            if (held) await waiting.clear();
            session.setUser(null);
            return ACCOUNT_NOTICES.signedOutEverywhere;
          });
        }} />
        {/* Only an account with a password has one to change; one opened with Apple or Google doesn't (#194). */}
        {user.hasPassword !== false ? <Button kind="quiet" label={t('common.account.changePassword')} onPress={() => router.push('/change-password')} /> : null}
      </Screen>
    );
  }

  return (
    <Screen title={t('common.account.signInTitle')} lead={t('common.account.passwordsPrivate')}>
      {/* Continue with Google and Apple (#217): only once the server says they work on this phone. */}
      <SocialSignIn />
      <Field label={t('common.account.identifier')} value={identifier} onChangeText={setIdentifier} autoCapitalize="none" autoComplete="username" textContentType="username" />
      <Field label={t('common.account.password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" />
      <Notice message={notice} tone={problem ? 'problem' : 'info'} />
      <Button label={t('common.account.signIn')} pending={pending === 'sign-in'} pendingLabel={t('common.account.signingIn')} disabled={!identifier || !password} onPress={() => run('sign-in', async () => {
        session.setUser(await session.client.login({ identifier: identifier.trim(), password }));
        setPassword('');
        return null;
      }, 'error.signIn')} />
      <Button kind="quiet" label={t('common.account.forgotPassword')} onPress={() => router.push('/recovery')} />
      <Button kind="quiet" label={t('common.account.createAccount')} onPress={() => router.push('/register')} />
      {/* Kept through signing in: once signed in, the invitation opens again by itself (#266). */}
      <Button kind="quiet" label={INVITATION_WORDS.haveOne} onPress={() => router.push('/invite')} />
    </Screen>
  );
}
