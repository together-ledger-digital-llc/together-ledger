# Device Settings

Reads the browser's accessibility settings for motion and contrast. It never leaves the device or sends this information anywhere.

To use in another app, copy the `src/a11y/device-settings` folder into your project.

## Usage

```javascript
import { prefersReducedMotion, prefersMoreContrast, onDeviceSettingsChange } from './a11y/device-settings/device-settings.js';

if (prefersReducedMotion()) {
  // Disable animations
}

const stopListening = onDeviceSettingsChange(() => {
  console.log('Settings changed');
});
```
