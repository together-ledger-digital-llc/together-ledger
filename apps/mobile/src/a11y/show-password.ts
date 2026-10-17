export function showPasswordButton(shown: boolean, t: (key: string) => string) {
  const labelKey = shown ? 'common.password.hide' : 'common.password.show';
  return {
    secure: !shown,
    labelKey,
    label: t(labelKey),
  };
}
