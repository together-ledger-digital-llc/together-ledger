export function prefersReducedMotion() {
  if (typeof matchMedia === 'undefined') return false;
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function prefersMoreContrast() {
  if (typeof matchMedia === 'undefined') return false;
  return matchMedia('(prefers-contrast: more)').matches;
}

export function onDeviceSettingsChange(callback) {
  if (typeof matchMedia === 'undefined') return () => {};

  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const contrastQuery = matchMedia('(prefers-contrast: more)');

  const handleChange = () => callback();

  motionQuery.addEventListener('change', handleChange);
  contrastQuery.addEventListener('change', handleChange);

  return () => {
    motionQuery.removeEventListener('change', handleChange);
    contrastQuery.removeEventListener('change', handleChange);
  };
}
