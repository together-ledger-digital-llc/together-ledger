import { router } from 'expo-router';
import { useState } from 'react';
import { accountMessage } from '../src/auth/account-messages';
import { useSession } from '../src/auth/session';
import { SocialSignIn } from '../src/components/social-sign-in';
import { Button, Field, Notice, Screen } from '../src/components/ui';
import { t } from '../src/i18n';
import { useLanguage } from '../src/i18n/language-provider';

/** Create an account from the phone. The hints are the web form's, word for word. */
export default function RegisterScreen() {
  const session = useSession();
  // Its words are read again when the language changes.
  useLanguage();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function register() {
    setPending(true);
    setNotice(null);
    try {
      const { user, verificationSent } = await session.client.register({ username: username.trim(), email: email.trim(), password });
      session.setUser(user);
      router.replace({ pathname: '/account', params: { notice: verificationSent ? 'registered' : 'registeredEmailDelayed' } });
    } catch (error) {
      setNotice(accountMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen title={t('register.form.title')}>
      {/* The same buttons as Sign in (#217): a Google or Apple account opens here as well as there. */}
      <SocialSignIn onSignedIn={() => router.replace('/account')} />
      <Field label={t('register.form.username')} hint={t('register.form.usernameHelp')} value={username} onChangeText={setUsername} autoCapitalize="none" autoComplete="username-new" textContentType="username" />
      <Field label={t('register.form.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
      <Field label={t('signIn.form.password')} hint={t('register.form.passwordHelp')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
      <Notice message={notice} tone="problem" />
      <Button label={t('register.form.submit')} pending={pending} pendingLabel={t('register.form.pending')} disabled={!username || !email || !password} onPress={register} />
    </Screen>
  );
}
