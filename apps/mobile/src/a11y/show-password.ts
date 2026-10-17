import { t } from '../i18n/sentences.js';

export function showPasswordButton(shown: boolean) {
  const labelKey = shown ? 'common.password.hide' : 'common.password.show';
  return {
    secure: !shown,
    labelKey,
    label: t(labelKey),
  };
}
